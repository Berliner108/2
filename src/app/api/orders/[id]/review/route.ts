// src/app/api/orders/[id]/review/route.ts
import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const orderId = id
    if (!orderId) return NextResponse.json({ error: 'Order-ID fehlt' }, { status: 400 })

    const body = await req.json().catch(() => ({} as any))
    const starsRaw = body?.rating ?? body?.stars
    const stars = Number(starsRaw)
    const comment = (body?.comment ?? '').toString().trim()

    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return NextResponse.json({ error: 'Rating muss 1–5 Sterne sein' }, { status: 400 })
    }
    if (!comment) {
      return NextResponse.json({ error: 'Kommentar erforderlich' }, { status: 400 })
    }

    // Auth
    const sb = await supabaseServer()
    const { data: { user }, error: userErr } = await sb.auth.getUser()
    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })
    if (!user)    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    // Order laden & prüfen: User muss Käufer ODER Anbieter sein
    const { data: order, error: ordErr } = await sb
      .from('orders')
      .select('id, kind, buyer_id, supplier_id')
      .eq('id', orderId)
      .eq('kind', 'lack')
      .single()

    if (ordErr) return NextResponse.json({ error: ordErr.message }, { status: 400 })
    if (!order)  return NextResponse.json({ error: 'Order nicht gefunden' }, { status: 404 })

    const isBuyer    = order.buyer_id    === user.id
    const isSupplier = order.supplier_id === user.id
    if (!isBuyer && !isSupplier) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }
    const rateeId = isBuyer ? order.supplier_id : order.buyer_id

    const admin = supabaseAdmin()

    // Schon bewertet? (je Rater & Order genau 1x)
    const { data: existing, error: existErr } = await admin
      .from('reviews')
      .select('id')
      .eq('order_id', orderId)
      .eq('rater_id', user.id)
      .maybeSingle()

    if (existErr) return NextResponse.json({ error: existErr.message }, { status: 400 })
    if (existing) return NextResponse.json({ error: 'bereits bewertet' }, { status: 409 })

    // INSERT: rating = String(stars) -> passt zu deinem ENUM (’1’…’5’)
    const { error: insErr } = await admin
      .from('reviews')
      .insert({
        order_id: orderId,
        rater_id: user.id,
        ratee_id: rateeId,
        rating: String(stars) as any, // ENUM-Label ’1’..’5’
        stars,                        // numerisch 1..5 (deine echte Auswertung)
        comment: comment.slice(0, 800),
      })

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Fehlgeschlagen' }, { status: 500 })
  }
}
