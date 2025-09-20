// /src/app/api/cron/cleanup/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const FINAL_REQUEST_STATES = new Set(['awarded','paid','closed','cancelled','archived','deleted','mediated'])
const DAYS_28_MS = 28 * 24 * 60 * 60 * 1000

export async function GET() {
  const admin = supabaseAdmin()
  const nowISO = new Date().toISOString()

  /* 1) lack_requests hart schließen: published=false in finalen Zuständen */
  try {
    // Wir ziehen in kleinen Batches, damit das bei vielen Datensätzen skaliert
    const BATCH = 500
    let page = 0
    while (true) {
      const from = page * BATCH
      const to = from + (BATCH - 1)

      const { data: reqs, error } = await admin
        .from('lack_requests')
        .select('id, status, published')
        .in('status', Array.from(FINAL_REQUEST_STATES))
        .eq('published', true)
        .order('id', { ascending: true })
        .range(from, to)

      if (error) {
        console.error('[cleanup] fetch final requests failed:', error.message)
        break
      }
      if (!reqs || reqs.length === 0) break

      const ids = reqs.map(r => String(r.id))
      const { error: upErr } = await admin
        .from('lack_requests')
        .update({ published: false, updated_at: nowISO })
        .in('id', ids)

      if (upErr) console.error('[cleanup] final requests set published=false failed:', upErr.message)
      if (reqs.length < BATCH) break
      page++
    }
  } catch (e: any) {
    console.error('[cleanup] step1 failed:', e?.message)
  }

  /* 2) orders.auto_release_at backfillen, wenn reported_at existiert */
  try {
    const BATCH = 500
    let page = 0
    while (true) {
      const from = page * BATCH
      const to = from + (BATCH - 1)

      const { data: orders, error } = await admin
        .from('orders')
        .select('id, reported_at, auto_release_at')
        .is('auto_release_at', null)
        .not('reported_at', 'is', null)
        .order('id', { ascending: true })
        .range(from, to)

      if (error) {
        console.error('[cleanup] fetch orders for auto_release_at backfill failed:', error.message)
        break
      }
      if (!orders || orders.length === 0) break

      for (const o of orders) {
        try {
          const base = new Date(o.reported_at as string).getTime()
          const newAuto = new Date(base + DAYS_28_MS).toISOString()
          await admin
            .from('orders')
            .update({ auto_release_at: newAuto, updated_at: nowISO })
            .eq('id', o.id)
        } catch (e: any) {
          console.error('[cleanup] backfill auto_release_at failed', o.id, e?.message)
        }
      }

      if (orders.length < BATCH) break
      page++
    }
  } catch (e: any) {
    console.error('[cleanup] step2 failed:', e?.message)
  }

  /* 3) Konsistenz: released → lack_requests.status='paid' */
  try {
    const BATCH = 500
    let page = 0
    while (true) {
      const from = page * BATCH
      const to = from + (BATCH - 1)

      // Hole Orders, die released sind
      const { data: orders, error } = await admin
        .from('orders')
        .select('id, request_id')
        .eq('status', 'released')
        .order('id', { ascending: true })
        .range(from, to)

      if (error) {
        console.error('[cleanup] fetch released orders failed:', error.message)
        break
      }
      if (!orders || orders.length === 0) break

      const reqIds = Array.from(new Set(orders.map(o => String(o.request_id)).filter(Boolean)))

      if (reqIds.length) {
        // Nur Requests updaten, die noch nicht in final „bezahltem“ Zustand sind
        const { data: reqs, error: reqErr } = await admin
          .from('lack_requests')
          .select('id, status')
          .in('id', reqIds)

        if (reqErr) {
          console.error('[cleanup] fetch requests for paid update failed:', reqErr.message)
        } else {
          const toPaid = reqs
            ?.filter(r => r && r.status !== 'paid')
            ?.map(r => String(r.id)) ?? []

          if (toPaid.length) {
            const { error: upErr } = await admin
              .from('lack_requests')
              .update({ status: 'paid', updated_at: nowISO, published: false })
              .in('id', toPaid)

            if (upErr) console.error('[cleanup] set requests paid failed:', upErr.message)
          }
        }
      }

      if (orders.length < BATCH) break
      page++
    }
  } catch (e: any) {
    console.error('[cleanup] step3 failed:', e?.message)
  }

  /* 4) Konsistenz: canceled → lack_requests.status='cancelled' (aber nur, wenn nicht bereits „paid/closed/...“) */
  try {
    const BATCH = 500
    let page = 0
    while (true) {
      const from = page * BATCH
      const to = from + (BATCH - 1)

      const { data: orders, error } = await admin
        .from('orders')
        .select('id, request_id')
        .eq('status', 'canceled')
        .order('id', { ascending: true })
        .range(from, to)

      if (error) {
        console.error('[cleanup] fetch canceled orders failed:', error.message)
        break
      }
      if (!orders || orders.length === 0) break

      const reqIds = Array.from(new Set(orders.map(o => String(o.request_id)).filter(Boolean)))
      if (reqIds.length) {
        const { data: reqs, error: reqErr } = await admin
          .from('lack_requests')
          .select('id, status')
          .in('id', reqIds)

        if (reqErr) {
          console.error('[cleanup] fetch requests for cancelled update failed:', reqErr.message)
        } else {
          const toCancelled = reqs
            ?.filter(r => r && !FINAL_REQUEST_STATES.has(r.status ?? '')) // nur wenn noch nicht final
            ?.map(r => String(r.id)) ?? []

          if (toCancelled.length) {
            const { error: upErr } = await admin
              .from('lack_requests')
              .update({ status: 'cancelled', updated_at: nowISO, published: false })
              .in('id', toCancelled)

            if (upErr) console.error('[cleanup] set requests cancelled failed:', upErr.message)
          }
        }
      }

      if (orders.length < BATCH) break
      page++
    }
  } catch (e: any) {
    console.error('[cleanup] step4 failed:', e?.message)
  }

  /* 5) processed_events hausputz (optional) */
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    // Tabelle könnte fehlen – dann still weitermachen
    const { error } = await admin
      .from('processed_events')
      .delete()
      .lt('created_at', cutoff)
    if (error && !String(error.message || '').includes('relation')) {
      console.error('[cleanup] processed_events cleanup failed:', error.message)
    }
  } catch (e: any) {
    console.error('[cleanup] step5 failed:', e?.message)
  }

  return NextResponse.json({ ok: true })
}
