// src/app/api/promo/checkout/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VERBOSE = true;
const DISABLE_OWNER_CHECK = process.env.DISABLE_PROMO_OWNER_CHECK === '1';
const USE_TAX = process.env.PROMO_USE_AUTOMATIC_TAX === 'true';

function err(msg: string, status = 400, extra?: Record<string, any>) {
  if (extra) console.error('[promo/checkout:error]', msg, extra);
  else       console.error('[promo/checkout:error]', msg);
  return NextResponse.json(
    { error: msg, ...(VERBOSE && extra ? { details: extra } : {}) },
    { status }
  );
}

/* Diagnose */
export async function GET() {
  try {
    const sk = process.env.STRIPE_SECRET_KEY;
    if (!sk) return NextResponse.json({ ok: false, error: 'STRIPE_SECRET_KEY fehlt' }, { status: 500 });
    const stripe = new Stripe(sk);
    const prods = await stripe.products.list({ active: true, limit: 100, expand: ['data.default_price'] });

    const items = prods.data.map((p) => {
      const price = p.default_price as Stripe.Price | null;
      return {
        code: String(p.metadata?.code ?? '').toLowerCase() || null,
        product_id: p.id,
        product_name: p.name,
        default_price_id: price && typeof price === 'object' ? price.id : null,
        default_price_active: !!(price && typeof price === 'object' && price.active),
        type: (price && typeof price === 'object' ? price.type : 'unknown') as 'one_time' | 'recurring' | 'unknown',
        unit_amount: price && typeof price === 'object' ? (typeof price.unit_amount === 'number' ? price.unit_amount : null) : null,
        currency: price && typeof price === 'object' ? (price.currency ?? null) : null,
      };
    });

    return NextResponse.json({
      ok: true,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        USE_TAX,
        DISABLE_OWNER_CHECK,
        APP_ORIGIN: process.env.APP_ORIGIN ?? null,
        VERBOSE,
      },
      count: items.length,
      items,
    });
  } catch (e: any) {
    console.error('[promo/checkout:GET error]', e?.message || e);
    return NextResponse.json({ ok: false, error: e?.message || 'GET failed' }, { status: 500 });
  }
}

/* Checkout */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const requestId: string = body?.request_id;
    let packageIds: string[] = Array.isArray(body?.package_ids) ? body.package_ids : [];
    let priceIds:   string[] = Array.isArray(body?.price_ids)   ? body.price_ids   : [];

    if (!requestId || (packageIds.length === 0 && priceIds.length === 0)) {
      return err('request_id und (package_ids[] ODER price_ids[]) sind erforderlich.', 400, { body });
    }

    // Supabase-Auth
    const sb = await supabaseServer();
    const { data: { user }, error: userErr } = await sb.auth.getUser();
    if (userErr) return err('Auth-Fehler', 500, { userErr: userErr.message });
    if (!user)   return err('Not authenticated', 401);

    if (!DISABLE_OWNER_CHECK) {
      // TODO: requestId -> gehört zu user.id?
    }

    const sk = process.env.STRIPE_SECRET_KEY;
    if (!sk) return err('Stripe ist nicht konfiguriert (STRIPE_SECRET_KEY fehlt).', 500);
    const stripe = new Stripe(sk);

    // Line Items nur über Price-IDs ODER über Codes (default_price)
    let line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let totalCents = 0;

    if (priceIds.length > 0) {
      const seen = new Set<string>();
      for (const raw of priceIds) {
        const pid = String(raw);
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
          return err(`Stripe-Preis ungültig/inaktiv: ${pid}`, 400, { pid, active: pr?.active, unit_amount: pr?.unit_amount });
        }
        if (pr.type === 'recurring') {
          return err(`Preis ${pid} ist als subscription angelegt. Verwende one_time.`, 400, { pid, type: pr.type });
        }
        line_items.push({ price: pr.id, quantity: 1 });
        totalCents += pr.unit_amount;
      }
    } else {
      const prods = await stripe.products.list({ active: true, limit: 100, expand: ['data.default_price'] });
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

      for (const code of Array.from(new Set(packageIds.map((s: string) => String(s).toLowerCase())))) {
        const pr = priceByCode.get(code);
        if (!pr || !pr.active || typeof pr.unit_amount !== 'number') missing.push(code);
        else if (pr.type === 'recurring') recurring.push(code);
        else prices.push(pr);
      }

      if (missing.length)   return err('Stripe-Preis fehlt/ungültig für: ' + missing.join(', '), 400, { missing });
      if (recurring.length) return err('Folgende Codes sind recurring: ' + recurring.join(', '), 400, { recurring });

      const currencies = Array.from(new Set(prices.map((p) => String(p.currency).toLowerCase())));
      if (currencies.length > 1) return err('Alle Pakete müssen dieselbe Währung haben.', 400, { currencies });

      line_items = prices.map((pr) => ({ price: pr.id, quantity: 1 }));
      totalCents = prices.reduce((s, pr) => s + Number(pr.unit_amount ?? 0), 0);
    }

    if (line_items.length === 0) return err('Keine gültigen line_items.', 400);

    // Redirects & Meta
    const u = new URL(req.url);
    const origin = process.env.APP_ORIGIN ?? `${u.protocol}//${u.host}`;
    const success_url = `${origin}/konto/lackanfragen?published=1&promo=success&requestId=${encodeURIComponent(requestId)}`;
    const cancel_url  = `${origin}/konto/lackanfragen?published=1&promo=cancel&requestId=${encodeURIComponent(requestId)}`;
    const metadata = {
      request_id: requestId,
      package_ids: Array.isArray(packageIds) ? packageIds.join(',') : '',
      user_id: user?.id ?? '',
    };

    // ⚠️ MINIMALER CHECKOUT-AUFRUF (nur das Nötigste!)
    try {
      const params: Stripe.Checkout.SessionCreateParams = {
        mode: 'payment',
        success_url,
        cancel_url,
        line_items,
        // NIX weiter – alles andere erstmal raus!
      };

      const session = await stripe.checkout.sessions.create(params);

      if (!session?.url) return err('Stripe-Session fehlerhaft (keine URL).', 500, { session });

      if (VERBOSE) console.log('[promo/checkout:ok]', { requestId, sessionId: session.id, totalCents, params });
      return NextResponse.json({ url: session.url, debug: VERBOSE ? { sessionId: session.id, totalCents } : undefined });
    } catch (se: any) {
      const forClient = {
        type: se?.type,
        code: se?.code,
        message: se?.message,
        param: se?.param,
        decline_code: se?.decline_code,
        statusCode: se?.statusCode,
        requestId: se?.requestId,
      };
      console.error('Stripe checkout.sessions.create error:', { ...forClient });
      return err('Stripe-Checkout konnte nicht erstellt werden.', 500, { stripe: forClient });
    }
  } catch (e: any) {
    return err('Checkout konnte nicht erstellt werden.', 500, { reason: e?.message });
  }
}
