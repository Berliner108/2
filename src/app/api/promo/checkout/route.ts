// app/api/promo/checkout/route.ts
import Stripe from 'stripe';
import { NextResponse } from 'next/server';

// Hilfsfunktion: Promo-Pakete laden (z.B. aus DB oder Service)
async function getPackages() {
  // MUSS dieselben IDs/Prices liefern wie dein Frontend (/api/promo/packages)
  // Beispiel: [{ id: 'homepage', stripe_price_id: 'price_123', title:'Homepage', ... }]
  const res = await fetch(`${process.env.INTERNAL_API_BASE}/promo/packages`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    // Wenn intern Auth nötig ist, hier Tokens/Cookies hinzufügen
  });
  if (!res.ok) throw new Error('Konnte Promo-Pakete nicht laden');
  const json = await res.json();
  const raw = Array.isArray(json) ? json : (json.items ?? json.data ?? []);
  return raw.map((i: any) => ({
    id: String(i.id ?? i._id ?? i.code),
    code: i.code ?? i.id ?? null,
    stripe_price_id: i.stripe_price_id ?? i.stripePriceId ?? null,
    title: i.title ?? '',
  }));
}

export async function POST(req: Request) {
  try {
    // 1) Auth prüfen (Beispiel – passe an dein System an)
    // z.B. aus Cookie/JWT/User-Service
    // const user = await getUserFromCookies(req.headers);
    // if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

    // 2) Body validieren
    const { request_id, package_ids } = await req.json();
    if (!request_id || !Array.isArray(package_ids) || package_ids.length === 0) {
      return NextResponse.json({ error: 'Ungültiger Request' }, { status: 400 });
    }

    // 3) Pakete auflösen → Stripe-Prices bauen
    const allPackages = await getPackages();
    const byId = new Map(allPackages.map(p => [p.id, p]));
    const chosen = package_ids.map((id: string) => byId.get(id)).filter(Boolean);

    if (chosen.length !== package_ids.length) {
      return NextResponse.json({ error: 'Unbekanntes Paket ausgewählt' }, { status: 400 });
    }
    const line_items = chosen.map(p => {
      if (!p!.stripe_price_id) {
        throw new Error(`Paket "${p!.id}" hat keine stripe_price_id`);
      }
      return { price: p!.stripe_price_id as string, quantity: 1 };
    });

    // 4) Stripe initialisieren
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2024-06-20',
    });
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'https://deine-domain.tld';

    // 5) Checkout-Session erstellen
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      allow_promotion_codes: true,
      // customer: user.stripeCustomerId, // optional, wenn vorhanden
      // customer_email: user.email,       // oder E-Mail setzen
      success_url: `${origin}/konto/lackanfragen?published=1&promo=success&requestId=${encodeURIComponent(request_id)}`,
      cancel_url: `${origin}/konto/lackanfragen?published=1&promo=cancelled&requestId=${encodeURIComponent(request_id)}`,
      metadata: {
        request_id: String(request_id),
        package_ids: package_ids.join(','),
      },
      // optional:
      // automatic_tax: { enabled: true },
    });

    // 6) URL zurückgeben (Frontend leitet um)
    return NextResponse.json({ url: session.url }, { status: 200 });
    // Alternativ direkt weiterleiten:
    // return NextResponse.redirect(session.url!, { status: 303 });
  } catch (err: any) {
    console.error('Checkout-Fehler:', err);
    return NextResponse.json(
      { error: err?.message || 'Stripe-Checkout konnte nicht erstellt werden.' },
      { status: 500 }
    );
  }
}
