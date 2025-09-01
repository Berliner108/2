// /src/app/api/angebot-einstellen/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const userClient = await supabaseServer()
  const admin = supabaseAdmin()

  // Nutzer aus Session
  const { data: auth } = await userClient.auth.getUser()
  const user = auth?.user
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const form = await req.formData()

  // Helpers
  const asArray = (v: any) =>
    typeof v === 'string' && v.trim() !== ''
      ? v.split(',').map(s => s.trim()).filter(Boolean)
      : []

  const toAddressString = (a: {
    strasse?: string; hausnummer?: string; plz?: string; ort?: string; land?: string
  }) => {
    const zeile1 = [a.strasse, a.hausnummer].filter(Boolean).join(' ')
    const zeile2 = [a.plz, a.ort].filter(Boolean).join(' ')
    return [zeile1, zeile2, a.land].filter(Boolean).join(', ')
  }

  // Pflichtfelder
  const kategorie = (form.get('kategorie') as string | null)?.toLowerCase() || ''
  const titel = (form.get('titel') as string | null)?.trim() || ''
  const lieferdatumStr = (form.get('lieferdatum') as string | null) || ''
  const menge = parseFloat((form.get('menge') as string | null) || '0')

  if (!kategorie || !titel || !lieferdatumStr || !Number.isFinite(menge) || menge <= 0) {
    return NextResponse.json({ error: 'Missing/invalid required fields' }, { status: 400 })
  }

  // Adresse (einzeln)
  const vorname    = (form.get('vorname')    as string | null)?.trim() || ''
  const nachname   = (form.get('nachname')   as string | null)?.trim() || ''
  const firma      = (form.get('firma')      as string | null)?.trim() || ''
  const strasse    = (form.get('strasse')    as string | null)?.trim() || ''
  const hausnummer = (form.get('hausnummer') as string | null)?.trim() || ''
  const plz        = (form.get('plz')        as string | null)?.trim() || ''
  const ort        = (form.get('ort')        as string | null)?.trim() || ''
  const land       = (form.get('land')       as string | null)?.trim() || ''

  // Normalisierte Felder aus der Adresse
  const lieferort = [plz, ort].filter(Boolean).join(' ') || ort || ''
  const lieferadresseStr = toAddressString({ strasse, hausnummer, plz, ort, land })

  // Restliche Felder aus dem Formular
  const payloadData = {
    kategorie,
    titel,
    menge,
    farbpalette: (form.get('farbpalette') as string | null) || '',
    farbton: (form.get('farbton') as string | null) || '',
    farbcode: (form.get('farbcode') as string | null) || '',
    glanzgrad: (form.get('glanzgrad') as string | null) || '',
    zustand: (form.get('zustand') as string | null) || '',
    oberflaeche: (form.get('oberflaeche') as string | null) || '',
    anwendung: (form.get('anwendung') as string | null) || '',
    hersteller: (form.get('hersteller') as string | null) || '',
    qualitaet: (form.get('qualitaet') as string | null) || '',
    zertifizierungen: asArray(form.get('zertifizierungen')),
    effekt: asArray(form.get('effekt')),
    sondereffekte: asArray(form.get('sondereffekte')),
    aufladung: asArray(form.get('aufladung')),
    beschreibung: (form.get('beschreibung') as string | null) || '',

    // Account / Meta
    lieferadresse_option: (form.get('lieferadresseOption') as string | null) || 'profil',
    account_type: (form.get('account_type') as string | null) || '',
    nutzerTyp: (form.get('nutzerTyp') as string | null) || '',
    istGewerblich: (form.get('istGewerblich') as string | null) === 'true',

    // Adresse – EINZELFELDER (wichtig!)
    vorname, nachname, firma, strasse, hausnummer, plz, ort, land,

    // Adresse – NORMALISIERT (für Börse/Detail)
    lieferort,                 // z.B. "12345 Berlin"
    lieferadresse: lieferadresseStr, // z.B. "Musterstr. 1, 12345 Berlin, Deutschland"

    // Medien (werden unten nach dem Upload befüllt)
    bilder: [] as string[],
    dateien: [] as { name: string; url: string }[],
  }

  // 1) Row anlegen
  const { data: inserted, error: insErr } = await admin
    .from('lack_requests')
    .insert({
      owner_id: user.id,
      title: titel,
      lieferdatum: lieferdatumStr, // YYYY-MM-DD
      status: 'open',
      published: true, // bei dir: sofort sichtbar
      data: payloadData,
    })
    .select('id')
    .single()

  if (insErr || !inserted) {
    console.error('[angebot-einstellen] insert failed', insErr?.message)
    return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
  }

  const reqId = inserted.id as string
  const bucket = 'lack-requests'
  const publicUrls: string[] = []
  const fileLinks: { name: string; url: string }[] = []

  // 2) Bilder hochladen
  const bildFiles = form.getAll('bilder') as File[]
  for (let i = 0; i < Math.min(bildFiles.length, 8); i++) {
    const f = bildFiles[i]
    if (!f || typeof f.arrayBuffer !== 'function') continue
    const ab = await f.arrayBuffer()
    const path = `${user.id}/${reqId}/images/${i}-${Date.now()}-${sanitizeName(f.name)}`
    const { error: upErr } = await admin.storage.from(bucket).upload(path, Buffer.from(ab), {
      contentType: f.type || 'application/octet-stream',
      upsert: false,
    })
    if (!upErr) {
      const { data: pub } = admin.storage.from(bucket).getPublicUrl(path)
      if (pub?.publicUrl) publicUrls.push(pub.publicUrl)
    } else {
      console.warn('[angebot-einstellen] image upload failed', upErr.message)
    }
  }

  // 3) Dateien hochladen
  const dateiFiles = form.getAll('dateien') as File[]
  for (let i = 0; i < Math.min(dateiFiles.length, 8); i++) {
    const f = dateiFiles[i]
    if (!f || typeof f.arrayBuffer !== 'function') continue
    const ab = await f.arrayBuffer()
    const path = `${user.id}/${reqId}/files/${i}-${Date.now()}-${sanitizeName(f.name)}`
    const { error: upErr } = await admin.storage.from(bucket).upload(path, Buffer.from(ab), {
      contentType: f.type || 'application/octet-stream',
      upsert: false,
    })
    if (!upErr) {
      const { data: pub } = admin.storage.from(bucket).getPublicUrl(path)
      if (pub?.publicUrl) fileLinks.push({ name: f.name, url: pub.publicUrl })
    } else {
      console.warn('[angebot-einstellen] file upload failed', upErr.message)
    }
  }

  // 4) Bilder/Dateien-URLs nachtragen (Adresse & lieferort bleiben erhalten)
  if (publicUrls.length || fileLinks.length) {
    const { error: updErr } = await admin
      .from('lack_requests')
      .update({
        data: {
          ...payloadData,
          bilder: publicUrls,
          dateien: fileLinks,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', reqId)
    if (updErr) console.warn('[angebot-einstellen] update data failed', updErr.message)
  }

  return NextResponse.json({ id: reqId })
}

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
}
