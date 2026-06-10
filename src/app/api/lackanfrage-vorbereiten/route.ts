import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const LACK_FILES_BUCKET = 'lack-requests'

function safeExtFromName(name: string) {
  const ext = name.includes('.') ? name.split('.').pop() : 'bin'

  return (
    String(ext || 'bin')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'bin'
  )
}

const asArray = (v: any) =>
  typeof v === 'string' && v.trim() !== ''
    ? v.split(',').map((s) => s.trim()).filter(Boolean)
    : Array.isArray(v)
      ? v
      : []

function toAddressString(a: {
  strasse?: string
  hausnummer?: string
  plz?: string
  ort?: string
  land?: string
}) {
  const zeile1 = [a.strasse, a.hausnummer].filter(Boolean).join(' ')
  const zeile2 = [a.plz, a.ort].filter(Boolean).join(' ')
  return [zeile1, zeile2, a.land].filter(Boolean).join(', ')
}

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

    const kategorie = String(body.kategorie ?? '').toLowerCase()
    const titel = String(body.titel ?? '').trim()
    const lieferdatumStr = String(body.lieferdatum ?? '')
    const menge = Number(body.menge ?? 0)

    if (!kategorie || !titel || !lieferdatumStr || !Number.isFinite(menge) || menge <= 0) {
      return NextResponse.json(
        { error: 'missing_required_fields' },
        { status: 400 },
      )
    }

    const bilder = Array.isArray(body.bilder) ? body.bilder : []
    const dateien = Array.isArray(body.dateien) ? body.dateien : []

    if (bilder.length === 0) {
      return NextResponse.json(
        { error: 'missing_images' },
        { status: 400 },
      )
    }

    const vorname = String(body.vorname ?? '').trim()
    const nachname = String(body.nachname ?? '').trim()
    const firma = String(body.firma ?? '').trim()
    const strasse = String(body.strasse ?? '').trim()
    const hausnummer = String(body.hausnummer ?? '').trim()
    const plz = String(body.plz ?? '').trim()
    const ort = String(body.ort ?? '').trim()
    const land = String(body.land ?? '').trim()

    const lieferort = [plz, ort].filter(Boolean).join(' ') || ort || ''
    const lieferadresseStr = toAddressString({
      strasse,
      hausnummer,
      plz,
      ort,
      land,
    })

    const payloadData = {
      kategorie,
      titel,
      menge,

      farbpalette: body.farbpalette || '',
      farbton: body.farbton || '',
      farbcode: body.farbcode || '',
      glanzgrad: body.glanzgrad || '',
      zustand: body.zustand || '',
      oberflaeche: body.oberflaeche || '',
      anwendung: body.anwendung || '',
      hersteller: body.hersteller || '',
      qualitaet: body.qualitaet || '',

      zertifizierungen: asArray(body.zertifizierungen),
      effekt: asArray(body.effekt),
      sondereffekte: asArray(body.sondereffekte),
      aufladung: asArray(body.aufladung),

      beschreibung: body.beschreibung || '',

      lieferadresse_option: body.lieferadresseOption || 'profil',
      account_type: body.account_type || '',
      nutzerTyp: body.nutzerTyp || '',
      istGewerblich: body.istGewerblich === true,

      vorname,
      nachname,
      firma,
      strasse,
      hausnummer,
      plz,
      ort,
      land,

      lieferort,
      lieferadresse: lieferadresseStr,

      bilder: [] as string[],
      dateien: [] as { name: string; url: string }[],
    }

    const { data: inserted, error: insertError } = await supabase
      .from('lack_requests')
      .insert({
        owner_id: user.id,
        title: titel,
        lieferdatum: lieferdatumStr,
        status: 'open',
        published: false,
        data: payloadData,
      })
      .select('id')
      .single()

    if (insertError || !inserted) {
      console.error('Fehler beim Anlegen der Lackanfrage:', insertError)

      return NextResponse.json(
        {
          error: 'lack_request_insert_failed',
          details: insertError?.message,
        },
        { status: 500 },
      )
    }

    const requestId = inserted.id as string

    const uploadItems = [
      ...bilder.map((file: any) => ({
        kind: 'image' as const,
        originalName: file.name,
        mimeType: file.type || null,
        sizeBytes: typeof file.size === 'number' ? file.size : null,
      })),
      ...dateien.map((file: any) => ({
        kind: 'document' as const,
        originalName: file.name,
        mimeType: file.type || null,
        sizeBytes: typeof file.size === 'number' ? file.size : null,
      })),
    ]

    const uploads = []

    for (const item of uploadItems) {
      const folder = item.kind === 'image' ? 'images' : 'files'
      const ext = safeExtFromName(item.originalName || 'datei.bin')

      const path = `${requestId}/${folder}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`

      const { data, error } = await supabase.storage
        .from(LACK_FILES_BUCKET)
        .createSignedUploadUrl(path)

      if (error || !data) {
        console.error('Fehler beim Erzeugen der Upload-URL:', error)

        return NextResponse.json(
          {
            error: 'signed_url_failed',
            details: error?.message,
          },
          { status: 500 },
        )
      }

      uploads.push({
        kind: item.kind,
        path,
        token: data.token,
        originalName: item.originalName,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
      })
    }

    return NextResponse.json({
      ok: true,
      requestId,
      bucket: LACK_FILES_BUCKET,
      uploads,
    })
  } catch (err: any) {
    console.error('Fehler in /api/lackanfrage-vorbereiten:', err)

    return NextResponse.json(
      {
        error: 'internal_error',
        details: err?.message ?? String(err),
      },
      { status: 500 },
    )
  }
}