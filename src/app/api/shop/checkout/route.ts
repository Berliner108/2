export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseRouteClient } from "@/lib/supabase-route";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-07-30.basil",

});

const PROMO_PACKAGES: Record<
  string,
  { score: number; amount_cents: number; stripe_price_id: string }
> = {
  homepage: {
    score: 30,
    amount_cents: 6999,
    stripe_price_id: "price_1SnivcFuDHMUzVXYDmZEK0Mh",
  },
  search_boost: {
    score: 15,
    amount_cents: 4999,
    stripe_price_id: "price_1SniupFuDHMUzVXYLUCFGqNO",
  },
  premium: {
    score: 12,
    amount_cents: 3499,
    stripe_price_id: "price_1SnitDFuDHMUzVXYhBbhbjrw",
  },
};

function getOrigin(req: Request) {
  const h = req.headers;
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  return host ? `${proto}://${host}` : "https://beschichterscout.com";
}

export async function POST(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "MISSING_STRIPE_SECRET_KEY" }, { status: 500 });
    }

    // Auth (Seller muss eingeloggt sein)
    const supaRoute = await createSupabaseRouteClient();
    const { data: sessionRes, error: sessionErr } = await supaRoute.auth.getSession();
    if (sessionErr) return NextResponse.json({ error: sessionErr.message }, { status: 401 });
    const user = sessionRes?.session?.user;
    if (!user) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const articleId = String(body?.article_id || "").trim();
    const promoCodes = Array.isArray(body?.promo_codes) ? body.promo_codes : [];

    if (!articleId) {
      return NextResponse.json({ error: "MISSING_ARTICLE_ID" }, { status: 400 });
    }
    const cleanedCodes = promoCodes
      .map((c: any) => String(c || "").trim())
      .filter(Boolean);

    if (cleanedCodes.length === 0) {
      return NextResponse.json({ error: "NO_PROMO_SELECTED" }, { status: 400 });
    }

    // ✅ fälschungssicher: nur erlaubte Codes zählen
    const validCodes = cleanedCodes.filter((c: string) => Boolean(PROMO_PACKAGES[c]));

    if (validCodes.length === 0) {
      return NextResponse.json({ error: "NO_VALID_PROMO_CODES" }, { status: 400 });
    }

    // Artikel gehört dem User?
    const admin = supabaseAdmin();
    const { data: art, error: artErr } = await admin
      .from("articles")
      .select("id, owner_id")
      .eq("id", articleId)
      .single();

    if (artErr || !art) {
      return NextResponse.json({ error: "ARTICLE_NOT_FOUND" }, { status: 404 });
    }
    if (art.owner_id && art.owner_id !== user.id) {
      return NextResponse.json({ error: "NOT_OWNER" }, { status: 403 });
    }

    // Summe + PromoScore serverseitig berechnen
    const promoScore = validCodes.reduce((sum, c) => sum + PROMO_PACKAGES[c].score, 0);
    const amountCents = validCodes.reduce((sum, c) => sum + PROMO_PACKAGES[c].amount_cents, 0);

    // Stripe line_items
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = validCodes.map((c) => ({
      price: PROMO_PACKAGES[c].stripe_price_id,
      quantity: 1,
    }));

    const origin = getOrigin(req);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${origin}/kaufen?promo=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/kaufen?promo=cancel&session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        kind: "shop_promo",
        article_id: articleId,
        user_id: user.id,
        promo_codes: JSON.stringify(validCodes),
        promo_score: String(promoScore),
      },
    });

    if (!session?.id || !session?.url) {
      return NextResponse.json({ error: "CHECKOUT_SESSION_FAILED" }, { status: 500 });
    }

    // ✅ pending Datensatz (Webhook macht später "paid" + erhöht promo_score)
    const ins = await admin.from("promo_payments").insert({
      user_id: user.id,
      article_id: articleId,
      stripe_session_id: session.id,
      promo_codes: validCodes,
      promo_score: promoScore,
      amount_cents: amountCents,
      currency: "eur",
      status: "pending",
    });

    if (ins.error) {
      return NextResponse.json({ error: ins.error.message }, { status: 500 });
    }

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN_ERROR" }, { status: 500 });
  }
}
