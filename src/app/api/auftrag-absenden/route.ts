import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const PROMO_SCORES: Record<string, number> = {
  startseite: 30,
  suche: 15,
  premium: 12,
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer()

    // User holen (damit wir user_id speichern können)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error('auth error:', authError)
    }
    if (!user) {
      return NextResponse.json(
        { error: 'not_authenticated' },
        { status: 401 },
      )
    }

    const formData = await req.formData()

    // ---------- einfache Felder ----------
    const agbAccepted = formData.get('agbAccepted') === 'true'

    const materialguete = String(formData.get('materialguete') ?? '')
    const andereMaterialguete = String(
      formData.get('andereMaterialguete') ?? '',
    )

    const laenge = String(formData.get('laenge') ?? '')
    const breite = String(formData.get('breite') ?? '')
    const hoehe = String(formData.get('hoehe') ?? '')
    const masse = String(formData.get('masse') ?? '')

    const lieferDatum = String(formData.get('lieferDatum') ?? '')
    const abholDatum = String(formData.get('abholDatum') ?? '')
    const lieferArt = String(formData.get('lieferArt') ?? '')
    const abholArt = String(formData.get('abholArt') ?? '')

    const verfahren1 = String(formData.get('verfahren1') ?? '')
    const verfahren2 = String(formData.get('verfahren2') ?? '')

    const beschreibung = String(formData.get('beschreibung') ?? '')

    const serienauftragAktiv =
      formData.get('serienauftragAktiv') === 'true'
    const serienRhythmus = String(formData.get('serienRhythmus') ?? '')
    const serienTermineRaw = String(formData.get('serienTermine') ?? '[]')

    let serienTermine: any[] = []
    try {
      serienTermine = JSON.parse(serienTermineRaw || '[]')
    } catch {
      serienTermine = []
    }

    // Spezifikationen (JSON aus dem Formular)
    let specs: Record<string, any> = {}
const specsJson = formData.get('specSelections')
if (typeof specsJson === 'string' && specsJson.trim()) {
  try {
    specs = JSON.parse(specsJson)
  } catch (err) {
    console.warn('specSelections JSON parse error:', err)
  }
}

    // Bewerbung / Promo-Optionen
    const bewerbungOptionen: string[] = []
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('bewerbungOptionen[')) {
        bewerbungOptionen.push(String(value))
      }
    }

    const promoScore = bewerbungOptionen.reduce(
      (sum, id) => sum + (PROMO_SCORES[id] ?? 0),
      0,
    )
const { data: job, error: jobError } = await supabase
  .from('jobs')
  .insert({
    user_id: user.id,
    description: beschreibung || null,

    material_guete: materialguete || null,
    material_guete_custom:
      materialguete === 'Andere' && andereMaterialguete
        ? andereMaterialguete
        : null,

    laenge_mm: laenge ? Number(laenge) : null,
    breite_mm: breite ? Number(breite) : null,
    hoehe_mm: hoehe ? Number(hoehe) : null,
    masse_kg: masse ? Number(masse) : null,

    verfahren_1: verfahren1 || null,
    verfahren_2: verfahren2 || null,

    liefer_datum_utc: lieferDatum || null,
    rueck_datum_utc: abholDatum || null,
    liefer_art: lieferArt || null,
    rueck_art: abholArt || null,

    serienauftrag_aktiv: serienauftragAktiv,
    serien_rhythmus: serienRhythmus || null,
    serien_termine: serienTermine,
    serienauftrag: serienauftragAktiv,
    serienauftrag_rhythmus: serienRhythmus || null,

    promo_score: promoScore,
    promo_options: bewerbungOptionen,
    promo_flags: bewerbungOptionen,
    specs,
    agb_accepted: agbAccepted,
    published: true,
  })
  .select('id')
  .single()


    if (jobError || !job) {
      console.error('job insert error:', jobError)
      return NextResponse.json(
        { error: 'job_insert_failed', details: jobError?.message },
        { status: 500 },
      )
    }

    const jobId = job.id as string// ---------- Dateien ins Storage hochladen ----------
const BUCKET = 'job-files'

const fileRows: {
  job_id: string
  kind: 'image' | 'document'
  bucket: string
  path: string
  original_name: string | null
  mime_type: string | null
  size_bytes: number | null
}[] = []

for (const [key, value] of formData.entries()) {
  if (!(value instanceof File)) continue

  const isImage = key.startsWith('bilder[')
  const isDoc = key.startsWith('dateien[')
  if (!isImage && !isDoc) continue

  const kind: 'image' | 'document' = isImage ? 'image' : 'document'

  const random = Math.random().toString(36).slice(2)
  const safeName = value.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const path = `${user.id}/${jobId}/${kind}/${Date.now()}-${random}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, value, {
      cacheControl: '3600',
      upsert: false,
      contentType: value.type || undefined,
    })

  if (uploadError) {
    console.error('storage upload error:', uploadError)
    continue
  }

  fileRows.push({
    job_id: jobId,
    kind,
    bucket: BUCKET,
    path,
    original_name: value.name,
    mime_type: value.type || null,
    size_bytes: typeof value.size === 'number' ? value.size : null,
  })
}

if (fileRows.length > 0) {
  const { error: filesError } = await supabase.from('job_files').insert(fileRows)
  if (filesError) console.error('job_files insert error:', filesError)

  const imagesCount = fileRows.filter((f) => f.kind === 'image').length
  const filesCount = fileRows.filter((f) => f.kind === 'document').length

  await supabase
    .from('jobs')
    .update({ images_count: imagesCount, files_count: filesCount })
    .eq('id', jobId)
}

    return NextResponse.json({ ok: true, jobId }, { status: 200 })
  } catch (err: any) {
    console.error('UNHANDLED ERROR in /api/auftrag-absenden:', err)
    return NextResponse.json(
      { error: 'unexpected', details: String(err?.message ?? err) },
      { status: 500 },
    )
  }
}
