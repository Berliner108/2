import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'not_authenticated' },
        { status: 401 },
      )
    }

    const body = await req.json()

    const agbAccepted = body.agbAccepted === true

    if (!agbAccepted) {
      return NextResponse.json(
        { error: 'agb_not_accepted' },
        { status: 400 },
      )
    }

    const materialGuete = String(body.materialguete ?? '')
    const andereMaterialguete = String(body.andereMaterialguete ?? '').trim()

    const { data: jobInsert, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,

        description: body.beschreibung
          ? String(body.beschreibung).trim()
          : null,

        material_guete: materialGuete || null,
        material_guete_custom:
          materialGuete === 'Andere' && andereMaterialguete
            ? andereMaterialguete
            : null,

        laenge_mm: body.laenge ? String(body.laenge) : null,
        breite_mm: body.breite ? String(body.breite) : null,
        hoehe_mm: body.hoehe ? String(body.hoehe) : null,
        masse_kg: body.masse ? String(body.masse) : null,

        liefer_datum_utc: body.lieferDatum
          ? new Date(body.lieferDatum).toISOString()
          : null,

        rueck_datum_utc: body.abholDatum
          ? new Date(body.abholDatum).toISOString()
          : null,

        liefer_art: body.lieferArt || null,
        rueck_art: body.abholArt || null,

        serienauftrag_aktiv: body.serienauftragAktiv === true,
        serien_rhythmus: body.serienRhythmus || null,
        serien_termine: body.serienTermine || null,

        specs: body.specSelections || {},

        verfahren_1: body.verfahren1 || null,
        verfahren_2: body.verfahren2 || null,

        agb_accepted: true,

        published: false,
        status: 'open',

        promo_score: 0,
        promo_options: [],
        promo_flags: [],

        images_count: 0,
        files_count: 0,
      })
      .select('id')
      .single()

    if (jobError || !jobInsert) {
      console.error('Fehler beim Anlegen des Jobs:', jobError)

      return NextResponse.json(
        {
          error: 'job_insert_failed',
          details: jobError?.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok: true,
      jobId: jobInsert.id,
    })
  } catch (err: any) {
    console.error('Fehler in /api/auftrag-vorbereiten:', err)

    return NextResponse.json(
      {
        error: 'internal_error',
        details: err?.message ?? String(err),
      },
      { status: 500 },
    )
  }
}