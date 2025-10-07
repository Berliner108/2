// src/app/api/promo/checkout/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEV_VERBOSE = process.env.NODE_ENV !== 'production';
// WICHTIG: '1' = Owner-Check ausschalten, '0' oder leer = einschalten
const DISABLE_OWNER_CHECK = process.env.DISABLE_PROMO_OWNER_CHECK === '1';
const USE_TAX = process.env.PROMO_USE_AUTOMATIC_TAX === 'true';

function err(msg: string, status = 400, extra?: Record<string, any>) {
  if (DEV_VERBOSE && extra) {
    console.error('[promo/checkout:error]', msg, extra);
  } else {
    console.error('[promo/checkout:error]', msg);
  }
  return NextResponse.json(
    { error: msg, ...(DEV_VERBOSE && extra ? { details: extra } : {}) },
    { status }
  );
}

/* ------------------- GET: Diagnose ------------------- */
export async function GET() {
  try {
    const sk = process.env.STRIPE_SECRET_KEY;
    if (!sk) {
      return NextResponse.json(
        { ok: false, error: 'STRIPE_SECRET_KEY fehlt' },
        { status: 500 }
      );
    }
    const stripe = new Stripe(sk);

    const prods = await stripe.products.list({
      active: true,
      limit: 100,
      expand: ['data.default_price'],
    });

    const items = prods.data.map((p) => {
      const price = p.default_price as Stripe.Price | null;
      let type: 'one_time' | 'recurring' | 'unknown' = 'unknown';
      let unit_amount: number | null = null;
      let currency: string | null = null;
      let default_price_id: string | null = null;
      let default_price_active: boolean | null = null;

      if (price && typeof price === 'object') {
        type = (price.type as any) || 'unknown';
        unit_amount = typeof price.unit_amount === 'number' ? price.unit_amount : null;
        currency = price.currency ?? null;
        default_price_id = price.id;
        default_price_active = !!price.active;
      }

      return {
        code: String(p.metadata?.code ?? '').toLowerCase() || null,
        product_id: p.id,
        product_name: p.name,
        default_price_id,
        default_price_active,
        type,
        unit_amount,
        currency,
      };
    });

    return NextResponse.json({
      ok: true,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        USE_TAX,
        DISABLE_OWNER_CHECK,
        APP_ORIGIN: process.env.APP_ORIGIN ?? null,
      },
      count: items.length,
      items,
    });
  } catch (e: any) {
    console.error('[promo/checkout:GET error]', e?.message || e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'GET failed' },
      { status: 500 }
    );
  }
}

/* ------------------- POST: Checkout ------------------- */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));

    const requestId: string = body?.request_id;
    let packageIds: string[] = Array.isArray(body?.package_ids) ? body.package_ids : [];
    let priceIds: string[] = Array.isArray(body?.price_ids) ? body.price_ids : [];

    if (!requestId || (packageIds.length === 0 && priceIds.length === 0)) {
      return err('request_id und (package_ids[] ODER price_ids[]) sind erforderlich.', 400, { body });
    }

    // Codes normalisieren (nur für Metadaten)
    packageIds = Array.from(new Set(packageIds.map((s: string) => String(s).toLowerCase())));

    // Auth
    const sb = await supabaseServer();
    const { data: { user }, error: userErr } = await sb.auth.getUser();
    if (userErr) return err('Auth-Fehler', 500, { userErr: userErr.message });
    if (!user)   return err('Not authenticated', 401);

    // Optionaler Owner-Check
    if (!DISABLE_OWNER_CHECK) {
      // TODO: prüfen, ob requestId dem user.id gehört – abhängig von deiner DB
    }

    const sk = process.env.STRIPE_SECRET_KEY;
    if (!sk) return err('Stripe ist nicht konfiguriert (STRIPE_SECRET_KEY fehlt).', 500);
    const stripe = new Stripe(sk); // apiVersion absichtlich nicht hart gesetzt

    // Line Items bauen
    let line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let totalCents = 0;

    if (priceIds.length > 0) {
      // Direkt mit Price-IDs
      const seen = new Set<string>();
      for (const pidRaw of priceIds) {
        const pid = String(pidRaw);
        if (!pid || seen.has(pid)) continue;
        seen.add(pid);

        let pr: Stripe.Price;
        try {
          pr = await stripe.prices.retrieve(pid);
        } catch (e: any) {
          return err(`Stripe-Preis ${pid} konnte nicht geladen werden.`, 400, {
            pid,
            stripe: { message: e?.message, code: e?.code, type: e?.type },
          });
        }

        if (!pr?.active || typeof pr.unit_amount !== 'number') {
          return err(`Stripe-Preis ungültig/inaktiv: ${pid}`, 400, { pid });
        }
        if (pr.type === 'recurring') {
          return err(`Preis ${pid} ist als subscription angelegt. Verwende one_time.`, 400, {
            pid,
            type: pr.type,
          });
        }
        line_items.push({ price: pr.id, quantity: 1 });
        totalCents += pr.unit_amount;
      }
    } else {
      // Mapping über product.metadata.code
      const prods = await stripe.products.list({
        active: true,
        limit: 100,
        expand: ['data.default_price'],
      });

      const priceByCode = new Map<string, Stripe.Price>();
      for (const p of prods.data) {
        const code = String(p.metadata?.code ?? '').toLowerCase();
        if (!code) continue;

        let price = p.default_price as Stripe.Price | null;
        if (!price || typeof price !== 'object') {
          const list = await stripe.prices.list({ product: p.id, active: true, limit: 1 });
          price = list.data[0] ?? null;
        }
        if (price && typeof price === 'object') priceByCode.set(code, price);
      }

      const prices: Stripe.Price[] = [];
      const missing: string[] = [];
      const recurring: string[] = [];

      for (const code of packageIds) {
        const pr = priceByCode.get(code);
        if (!pr || !pr.active || typeof pr.unit_amount !== 'number') {
          missing.push(code);
        } else if (pr.type === 'recurring') {
          recurring.push(code);
        } else {
          prices.push(pr);
        }
      }

      if (missing.length) {
        return err('Stripe-Preis fehlt/ungültig für: ' + missing.join(', '), 400, { missing });
      }
      if (recurring.length) {
        return err(
          'Diese Pakete sind als wiederkehrender Preis (subscription) angelegt: ' +
            recurring.join(', ') +
            '. Entweder in Stripe auf one-time umstellen oder Checkout-Mode ändern.',
          400,
          { recurring }
        );
      }

      const currencies = Array.from(new Set(prices.map((p) => String(p.currency).toLowerCase())));
      if (currencies.length > 1) {
        return err('Alle Pakete müssen dieselbe Währung haben.', 400, { currencies });
      }

      line_items = prices.map((pr) => ({ price: pr.id, quantity: 1 }));
      totalCents = prices.reduce((s, pr) => s + Number(pr.unit_amount ?? 0), 0);
    }

    if (line_items.length === 0) {
      return err('Keine gültigen line_items.', 400);
    }

    // Redirect-URLs & Metadaten
    const u = new URL(req.url);
    const origin = process.env.APP_ORIGIN ?? `${u.protocol}//${u.host}`;
    const successUrl = `${origin}/konto/lackanfragen?published=1&promo=success&requestId=${encodeURIComponent(requestId)}`;
    const cancelUrl  = `${origin}/konto/lackanfragen?published=1&promo=cancel&requestId=${encodeURIComponent(requestId)}`;
    const codesCsv = packageIds.join(',');
    const metadata = {
      request_id: requestId,
      package_ids: codesCsv,
      user_id: user?.id ?? '',
    };

    // Session erstellen
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        line_items,
        billing_address_collection: 'required',
        customer_creation: 'always',
        customer_update: { address: 'auto' },
        automatic_tax: { enabled: !!USE_TAX },
        tax_id_collection: USE_TAX ? { enabled: true } : undefined,
        payment_intent_data: { metadata },
        metadata,
      });

      if (!session?.url) {
        return err('Stripe-Session fehlerhaft (keine URL).', 500, { session });
      }

      if (DEV_VERBOSE) {
        console.log('[promo/checkout:ok]', {
          requestId,
          packageIds,
          priceIds,
          sessionId: session.id,
          totalCents,
        });
      }

      return NextResponse.json({
        url: session.url,
        debug: DEV_VERBOSE
          ? { requestId, packageIds, priceIds, sessionId: session.id, totalCents }
          : undefined,
      });
    } catch (se: any) {
      console.error('Stripe checkout.sessions.create error:', {
        type: se?.type,
        code: se?.code,
        message: se?.message,
        param: se?.param,
        decline_code: se?.decline_code,
        statusCode: se?.statusCode,
        requestId: se?.requestId,
        raw: se?.raw,
      });

      return err('Stripe-Checkout konnte nicht erstellt werden.', 500, {
        stripe: {
          type: se?.type,
          code: se?.code,
          message: se?.message,
          param: se?.param,
          decline_code: se?.decline_code,
          statusCode: se?.statusCode,
          requestId: se?.requestId,
        },
      });
    }
  } catch (e: any) {
    return err('Checkout konnte nicht erstellt werden.', 500, { reason: e?.message });
  }
}
