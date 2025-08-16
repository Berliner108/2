// app/api/profile/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ===== Server-seitige Validierungen (wie im Registrieren-Formular) =====
const CITY_MAX = 24
const STREET_MAX = 48
const COMPANY_MAX = 80
const ZIP_MAX = 5

const ONLY_LETTERS_VALIDATE = /^[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß]+(?: [A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß]+)*$/
const HNR_RE = /^\d{1,3}[a-z]?$/
const ZIP_RE = /^\d{1,5}$/
const VAT_RE = /^[A-Z0-9-]{8,14}$/ // USt-ID

// Whitelist – akzeptiert snake_case + camelCase
const ALLOWED: Record<string, true> = {
  full_name: true,
  avatar_url: true,
  bio: true,
  website: true,
  location: true,
  address: true,
  payment_method: true,
  account_type: true,
  company_name: true,
  vat_number: true,
  // camelCase Aliase:
  accountType: true,
  companyName: true,
  vatNumber: true,
}

// Eingabe-Aliase (Eingabe-Key -> DB-Spaltenname)
const ALIASES: Record<string, string> = {
  accountType: 'account_type',
  companyName: 'company_name',
  vatNumber: 'vat_number',
}

type Addr = { street?: string; houseNumber?: string; zip?: string; city?: string }

function validateAddress(addr: any): { ok: boolean; value?: Addr; error?: string } {
  if (addr == null || typeof addr !== 'object') return { ok: false, error: 'invalid_address' }
  const street = String(addr.street ?? '').trim()
  const houseNumber = String(addr.houseNumber ?? '').trim()
  const zip = String(addr.zip ?? '').trim()
  const city = String(addr.city ?? '').trim()

  if (!street || !ONLY_LETTERS_VALIDATE.test(street) || street.length > STREET_MAX) {
    return { ok: false, error: 'invalid_street' }
  }
  if (!houseNumber || !HNR_RE.test(houseNumber)) {
    return { ok: false, error: 'invalid_house_number' }
  }
  if (!zip || !ZIP_RE.test(zip) || zip.length > ZIP_MAX) {
    return { ok: false, error: 'invalid_zip' }
  }
  if (!city || !ONLY_LETTERS_VALIDATE.test(city) || city.length > CITY_MAX) {
    return { ok: false, error: 'invalid_city' }
  }
  return { ok: true, value: { street, houseNumber, zip, city } }
}

export async function PUT(req: Request) {
  try {
    const sb = await supabaseServer()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 })

    const rawBody = await req.json().catch(() => ({} as any))

    // 1) Keys normalisieren (camelCase -> snake_case laut ALIASES)
    const body: Record<string, any> = {}
    for (const [k, v] of Object.entries(rawBody || {})) {
      const mapped = ALIASES[k] ?? k
      body[mapped] = v
    }

    // 2) Whitelist anwenden
    const update: Record<string, any> = {}
    for (const k of Object.keys(body)) {
      if (!ALLOWED[k]) continue
      if (k === 'address' || k === 'account_type' || k === 'company_name' || k === 'vat_number') continue // separat unten
      const v = body[k]
      update[k] = (typeof v === 'string' && v.trim() === '') ? null : v
    }

    // 3) account_type / company_name / vat_number
    let accountType: 'PRIVATE' | 'COMPANY' | undefined
    if (body.account_type != null) {
      const raw = String(body.account_type).toUpperCase()
      if (raw !== 'PRIVATE' && raw !== 'COMPANY') {
        return NextResponse.json({ ok: false, error: 'invalid_account_type' }, { status: 400 })
      }
      accountType = raw as 'PRIVATE' | 'COMPANY'
      update.account_type = accountType
    }

    if (accountType === 'PRIVATE') {
      update.company_name = null
      update.vat_number = null
    } else if (accountType === 'COMPANY') {
      const cn = body.company_name == null ? '' : String(body.company_name).trim()
      if (!cn || cn.length > COMPANY_MAX) {
        return NextResponse.json({ ok: false, error: 'invalid_company_name' }, { status: 400 })
      }
      update.company_name = cn

      const vat = (body.vat_number ?? '').toString().trim().toUpperCase()
      if (!VAT_RE.test(vat)) {
        return NextResponse.json({ ok: false, error: 'invalid_vat_number' }, { status: 400 })
      }
      update.vat_number = vat
    } else {
      // account_type nicht mitgeschickt -> weich validieren, falls Felder einzeln kommen
      if ('company_name' in body) {
        const cn = String(body.company_name ?? '').trim()
        if (cn === '') update.company_name = null
        else if (cn.length <= COMPANY_MAX) update.company_name = cn
        else return NextResponse.json({ ok: false, error: 'invalid_company_name' }, { status: 400 })
      }
      if ('vat_number' in body) {
        const vat = String(body.vat_number ?? '').trim().toUpperCase()
        if (vat === '') update.vat_number = null
        else if (VAT_RE.test(vat)) update.vat_number = vat
        else return NextResponse.json({ ok: false, error: 'invalid_vat_number' }, { status: 400 })
      }
    }

    // 4) address
    if ('address' in body) {
      const res = validateAddress(body.address)
      if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 400 })
      update.address = res.value
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ ok: false, error: 'nothing_to_update' }, { status: 400 })
    }

    // 5) Upsert statt Update (falls noch kein profiles-Datensatz existiert)
    const admin = supabaseAdmin()
    const { error } = await admin
      .from('profiles')
      .upsert(
        { id: user.id, ...update, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      )

    if (error) {
      console.error('[profile update] db:', error)
      return NextResponse.json({
        ok: false,
        error: 'db',
        message: String((error as any)?.message ?? ''),
        details: (error as any)?.details ?? null,
        hint: (error as any)?.hint ?? null,
        code: (error as any)?.code ?? null,
      }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[profile update] fatal:', e)
    return NextResponse.json({ ok: false, error: 'fatal', message: String(e?.message ?? e) }, { status: 500 })
  }
}
