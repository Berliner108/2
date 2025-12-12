// src/app/api/auftrag-absenden/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

type PromoId = 'startseite' | 'suche' | 'premium'

const PROMO_CONFIG: Record<PromoId, { score: number }> = {
  startseite: { score: 30 },
  suche: { score: 15 },
  premium: { score: 12 },
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer()

    // 🔐 User holen
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 })
    }

    const formData = await req.formData()

    // ---------- Grunddaten ----------
    const agbAccepted = formData.get('agbAccepted') === 'true'
    const beschreibung = String(formData.get('beschreibung') ?? '').trim()

    const materialguete = String(formData.get('materialguete') ?? '')
    const andereMaterialguete = String(
      formData.get('andereMaterialguete') ?? '',
    ).trim()

    const lieferDatum = String(formData.get('lieferDatum') ?? '') // YYYY-MM-DD
    const abholDatum = String(formData.get('abholDatum') ?? '')
    const lieferArt = String(formData.get('lieferArt') ?? '')
    const abholArt = String(formData.get('abholArt') ?? '')

    const verfahren1 = String(formData.get('verfahren1') ?? '')
    const verfahren2 = String(formData.get('verfahren2') ?? '')

    // ---------- Promo-Optionen ----------
    const promoSelected: PromoId[] = []
    for (const [key, value] of formData.entries()) {
      if (!key.startsWith('bewerbungOptionen[')) continue
      const id = String(value) as PromoId
      if (id in PROMO_CONFIG && !promoSelected.includes(id)) {
        promoSelected.push(id)
      }
    }

    const promoScore = promoSelected.reduce(
      (sum, id) => sum + PROMO_CONFIG[id].score,
      0,
    )

    // ---------- Minimal-Validierung ----------
    if (!lieferDatum || !abholDatum || !lieferArt || !abholArt) {
      return NextResponse.json(
        { error: 'Logistik unvollständig' },
        { status: 400 },
      )
    }
    if (!verfahren1) {
      return NextResponse.json(
        { error: 'Mindestens ein Verfahren ist erforderlich' },
        { status: 400 },
      )
    }
    if (!agbAccepted) {
      return NextResponse.json(
        { error: 'AGB müssen akzeptiert werden' },
        { status: 400 },
      )
    }

    const materialFinal =
      materialguete === 'Andere' && andereMaterialguete
        ? andereMaterialguete
        : materialguete || null

    // ---------- Job in jobs eintragen ----------
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        owner_user_id: user.id,
        description: beschreibung || null,
        material: materialFinal,
        warenausgabe_datum: lieferDatum,
        rueckgabe_datum: abholDatum,
        liefer_art: lieferArt,
        abhol_art: abholArt,
        promo_score: promoScore,
        promo_flags: promoSelected, // jsonb[]
        agb_accepted: agbAccepted,
        status: 'open',
        published: true,
      })
      .select('id')
      .single()

    if (jobError || !job) {
      console.error('Job insert error', jobError)
      return NextResponse.json(
        { error: 'Fehler beim Speichern des Auftrags' },
        { status: 500 },
      )
    }

    const jobId = job.id as string

    // ---------- Verfahren in job_procedures ----------
    const proceduresToInsert = [
      verfahren1 && { job_id: jobId, sort_index: 1, name: verfahren1 },
      verfahren2 && { job_id: jobId, sort_index: 2, name: verfahren2 },
    ].filter(Boolean) as { job_id: string; sort_index: number; name: string }[]

    if (proceduresToInsert.length > 0) {
      const { error: procError } = await supabase
        .from('job_procedures')
        .insert(proceduresToInsert)

      if (procError) {
        console.error('job_procedures insert error', procError)
        // optional: später mal Rollback/Logik ergänzen
      }
    }

    // 🔜 job_files & job_procedure_specs machen wir danach

    return NextResponse.json({ ok: true, jobId }, { status: 200 })
  } catch (err) {
    console.error('POST /api/auftrag-absenden unexpected', err)
    return NextResponse.json(
      { error: 'Unerwarteter Fehler beim Absenden' },
      { status: 500 },
    )
  }
}
