// /src/app/api/reviews/list/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const admin = supabaseAdmin()
    const { searchParams } = new URL(req.url)

    // Inputs
    const userId = searchParams.get('userId') || undefined
    const username = searchParams.get('username') || undefined
    const page = Math.max(1, Number(searchParams.get('page') || 1))
    const pageSizeRaw = Number(searchParams.get('pageSize') || 10)
    const pageSize = Math.min(50, Math.max(1, isNaN(pageSizeRaw) ? 10 : pageSizeRaw))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    // 1) ratee ermitteln
    let rateeId: string | null = null
    let rateeUsername: string | null = null

    if (userId) {
      rateeId = userId
      const { data: p, error } = await admin
        .from('profiles').select('username').eq('id', userId).maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      rateeUsername = p?.username ?? null
    } else if (username) {
      const { data: p, error } = await admin
        .from('profiles').select('id, username').ilike('username', username).maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      if (!p)     return NextResponse.json({ error: 'User not found' }, { status: 404 })
      rateeId = p.id; rateeUsername = p.username
    } else {
      return NextResponse.json({ error: 'Provide userId or username' }, { status: 400 })
    }

    // 2) Count + Page laden
    const countQ = admin
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('ratee_id', rateeId)

    const pageQ = admin
      .from('reviews')
      .select('id, rating, comment, created_at, rater_id')
      .eq('ratee_id', rateeId)
      .order('created_at', { ascending: false })
      .range(from, to)

    const [countRes, pageRes] = await Promise.all([countQ, pageQ])

    if (countRes.error) return NextResponse.json({ error: countRes.error.message }, { status: 400 })
    if (pageRes.error)  return NextResponse.json({ error: pageRes.error.message }, { status: 400 })

    const total: number = Number(countRes.count ?? 0)

    // 3) Rater-Namen auflösen
    const raterIds = Array.from(new Set((pageRes.data ?? []).map(r => r.rater_id).filter(Boolean))) as string[]
    let raterMap = new Map<string, { id: string; username: string | null }>()
    if (raterIds.length) {
      const { data: profs, error: profErr } = await admin
        .from('profiles')
        .select('id, username')
        .in('id', raterIds)
      if (profErr) return NextResponse.json({ error: profErr.message }, { status: 400 })
      for (const p of profs ?? []) raterMap.set(p.id, { id: p.id, username: p.username ?? null })
    }

    const reviews = (pageRes.data ?? []).map(r => ({
      id: r.id,
      rating: r.rating as 'good' | 'neutral',
      comment: r.comment,
      createdAt: r.created_at,
      rater: raterMap.get(r.rater_id) ?? { id: r.rater_id, username: null },
    }))

    const pages = Math.max(1, Math.ceil(total / pageSize))

    return NextResponse.json({
      ratee: { userId: rateeId, username: rateeUsername },
      page,
      pageSize,
      total,
      pages,
      reviews,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to list reviews' }, { status: 500 })
  }
}
