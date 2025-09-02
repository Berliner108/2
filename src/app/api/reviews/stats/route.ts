// /src/app/api/reviews/stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const admin = supabaseAdmin()
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || undefined
    const username = searchParams.get('username') || undefined

    // 1) ratee ermitteln
    let rateeId: string | null = null
    let rateeUsername: string | null = null

    if (userId) {
      rateeId = userId
      const { data: p } = await admin.from('profiles').select('username').eq('id', userId).maybeSingle()
      rateeUsername = p?.username ?? null
    } else if (username) {
      const { data: p, error } = await admin
        .from('profiles')
        .select('id, username')
        .ilike('username', username)
        .maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      if (!p)     return NextResponse.json({ error: 'User not found' }, { status: 404 })
      rateeId = p.id
      rateeUsername = p.username
    } else {
      return NextResponse.json({ error: 'Provide userId or username' }, { status: 400 })
    }

    // 2) Aggregation
    const totalQ = admin.from('reviews').select('id', { count: 'exact', head: true }).eq('ratee_id', rateeId)
    const goodQ  = admin.from('reviews').select('id', { count: 'exact', head: true }).eq('ratee_id', rateeId).eq('rating', 'good')
    const neutQ  = admin.from('reviews').select('id', { count: 'exact', head: true }).eq('ratee_id', rateeId).eq('rating', 'neutral')
    const lastQ  = admin.from('reviews').select('created_at').eq('ratee_id', rateeId).order('created_at', { ascending: false }).limit(1)

    const [totalRes, goodRes, neutRes, lastRes] = await Promise.all([totalQ, goodQ, neutQ, lastQ])

    if (lastRes.error) return NextResponse.json({ error: lastRes.error.message }, { status: 400 })

    // counts sicher in number umwandeln
    const total: number   = Number(totalRes.count  ?? 0)
    const good: number    = Number(goodRes.count   ?? 0)
    const neutral: number = Number(neutRes.count   ?? 0)

    const goodRatio  = total > 0 ? good / total : 0
    // Mapping: good=5.0 ★, neutral=4.0 ★ → Durchschnitt = 4 + goodRatio
    const avgStars   = total > 0 ? +(4 + goodRatio).toFixed(2) : null
    const lastReviewAt = lastRes.data?.[0]?.created_at ?? null

    return NextResponse.json({
      userId: rateeId,
      username: rateeUsername,
      totalReviews: total,
      goodCount: good,
      neutralCount: neutral,
      goodRatio,
      avgStars,
      lastReviewAt,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to fetch review stats' }, { status: 500 })
  }
}
