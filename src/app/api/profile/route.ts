// src/app/api/profile/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/* ---------- Validation ---------- */
const USERNAME_RE = /^[a-z0-9_-]{3,24}$/;

const CITY_MAX = 24;
const STREET_MAX = 48;
const COMPANY_MAX = 80;
const ZIP_MAX = 5;
const COUNTRY_MAX = 56;

const ONLY_LETTERS_VALIDATE =
  /^[A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß]+(?: [A-Za-zÀ-ÖØ-öø-ÿÄÖÜäöüß]+)*$/;
const HNR_RE = /^\d{1,3}[a-z]?$/;
const ZIP_RE = /^\d{1,5}$/;
const VAT_RE = /^[A-Z0-9-]{8,14}$/;

// strikt: nur diese Länder zulassen (wie im UI)
const COUNTRY_OPTIONS = new Set([
  'Deutschland',
  'Österreich',
  'Schweiz',
  'Liechtenstein',
]);

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
  username: true,
  // camelCase Aliase:
  accountType: true,
  companyName: true,
  vatNumber: true,
};

// Eingabe-Aliase (Eingabe-Key -> DB-Spaltenname)
const ALIASES: Record<string, string> = {
  accountType: 'account_type',
  companyName: 'company_name',
  vatNumber: 'vat_number',
};

type Addr = {
  street?: string;
  houseNumber?: string;
  zip?: string;
  city?: string;
  country?: string;
};

type DbAccountType = 'private' | 'business';

function normAccountType(val: unknown): DbAccountType | '' {
  const s = String(val ?? '').trim().toLowerCase();
  if (s === 'business' || s === 'company') return 'business';
  if (s === 'private') return 'private';
  return '';
}

function validateAddress(addr: any): { ok: boolean; value?: Addr; error?: string } {
  if (addr == null || typeof addr !== 'object') return { ok: false, error: 'invalid_address' };

  const street = String(addr.street ?? '').trim();
  const houseNumber = String(addr.houseNumber ?? '').trim();
  const zip = String(addr.zip ?? '').trim();
  const city = String(addr.city ?? '').trim();
  const country = String(addr.country ?? '').trim();

  if (!street || !ONLY_LETTERS_VALIDATE.test(street) || street.length > STREET_MAX) {
    return { ok: false, error: 'invalid_street' };
  }
  if (!houseNumber || !HNR_RE.test(houseNumber)) {
    return { ok: false, error: 'invalid_house_number' };
  }
  if (!zip || !ZIP_RE.test(zip) || zip.length > ZIP_MAX) {
    return { ok: false, error: 'invalid_zip' };
  }
  if (!city || !ONLY_LETTERS_VALIDATE.test(city) || city.length > CITY_MAX) {
    return { ok: false, error: 'invalid_city' };
  }
  // Country: nur aus Dropdown erlauben (oder leer)
  if (country) {
    if (country.length > COUNTRY_MAX) return { ok: false, error: 'invalid_country' };
    if (!COUNTRY_OPTIONS.has(country)) return { ok: false, error: 'invalid_country' };
  }

  return { ok: true, value: { street, houseNumber, zip, city, country } };
}

/* ===== GET: Profil lesen ===== */
export async function GET() {
  try {
    const sb = await supabaseServer();
    const {
      data: { user },
      error,
    } = await sb.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    }

    const meta: any = user.user_metadata || {};
    const admin = supabaseAdmin();

    const { data: row } = await admin
      .from('profiles')
      .select('id, username, account_type, company_name, vat_number, address')
      .eq('id', user.id)
      .maybeSingle();

    const accountNorm =
      normAccountType(row?.account_type) ||
      normAccountType(meta.accountType) ||
      '';

    const dbAddr = (row?.address as any) || {};
    const mdAddr = (meta.address as any) || {};

    const username =
      (row?.username && String(row.username).trim()) ||
      (typeof meta.username === 'string' && meta.username.trim()) ||
      (user.email?.split('@')[0] ?? '');

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        profile: {
          firstName: meta.firstName || '',
          lastName: meta.lastName || '',
          username,
          account_type: accountNorm, // 'business' | 'private' | ''
          company: row?.company_name || meta.companyName || '',
          vatNumber: row?.vat_number || meta.vatNumber || '',
          address: {
            street: dbAddr.street ?? mdAddr.street ?? '',
            houseNumber: dbAddr.houseNumber ?? mdAddr.houseNumber ?? '',
            zip: dbAddr.zip ?? mdAddr.zip ?? '',
            city: dbAddr.city ?? mdAddr.city ?? '',
            country: dbAddr.country ?? mdAddr.country ?? '',
          },
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    console.error('[profile GET] fatal:', e);
    return NextResponse.json({ error: 'fatal' }, { status: 500 });
  }
}

/* ===== PUT: Profil aktualisieren ===== */
export async function PUT(req: Request) {
  try {
    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

    const rawBody = await req.json().catch(() => ({} as any));

    // Aliase → snake_case
    const body: Record<string, any> = {};
    for (const [k, v] of Object.entries(rawBody || {})) {
      body[ALIASES[k] ?? k] = v;
    }

    // Whitelist kopieren; spezielle Felder später (username, address, account/company/vat)
    const update: Record<string, any> = {};
    for (const k of Object.keys(body)) {
      if (!ALLOWED[k]) continue;
      if (
        k === 'address' ||
        k === 'account_type' ||
        k === 'company_name' ||
        k === 'vat_number' ||
        k === 'username'
      ) {
        continue;
      }
      const v = body[k];
      update[k] = typeof v === 'string' && v.trim() === '' ? null : v;
    }

    // username (validieren)
    if ('username' in body) {
      const raw = String(body.username ?? '').trim().toLowerCase();
      if (raw === '') {
        update.username = null; // optional: Username zurücksetzen erlauben
      } else if (!USERNAME_RE.test(raw)) {
        return NextResponse.json({ ok: false, error: 'invalid_username' }, { status: 400 });
      } else {
        update.username = raw;
      }
    }

    // account_type / company_name / vat_number (gekoppelte Validierung)
    let accountTypeDb: DbAccountType | undefined;
    if (body.account_type != null) {
      const norm = normAccountType(body.account_type);
      if (!norm) {
        return NextResponse.json({ ok: false, error: 'invalid_account_type' }, { status: 400 });
      }
      accountTypeDb = norm;
      update.account_type = accountTypeDb;

      if (accountTypeDb === 'private') {
        update.company_name = null;
        update.vat_number = null;
      } else {
        const cn = String(body.company_name ?? '').trim();
        if (!cn || cn.length > COMPANY_MAX) {
          return NextResponse.json({ ok: false, error: 'invalid_company_name' }, { status: 400 });
        }
        update.company_name = cn;

        const vat = String(body.vat_number ?? '').trim().toUpperCase();
        if (!VAT_RE.test(vat)) {
          return NextResponse.json({ ok: false, error: 'invalid_vat_number' }, { status: 400 });
        }
        update.vat_number = vat;
      }
    } else {
      // weich validieren, falls Felder einzeln kommen
      if ('company_name' in body) {
        const cn = String(body.company_name ?? '').trim();
        if (cn === '') update.company_name = null;
        else if (cn.length <= COMPANY_MAX) update.company_name = cn;
        else return NextResponse.json({ ok: false, error: 'invalid_company_name' }, { status: 400 });
      }
      if ('vat_number' in body) {
        const vat = String(body.vat_number ?? '').trim().toUpperCase();
        if (vat === '') update.vat_number = null;
        else if (VAT_RE.test(vat)) update.vat_number = vat;
        else return NextResponse.json({ ok: false, error: 'invalid_vat_number' }, { status: 400 });
      }
    }

    // address
    if ('address' in body) {
      const res = validateAddress(body.address);
      if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
      update.address = res.value;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ ok: false, error: 'nothing_to_update' }, { status: 400 });
    }

    // Upsert (Admin umgeht RLS)
    const admin = supabaseAdmin();
    const { error } = await admin
      .from('profiles')
      .upsert(
        { id: user.id, ...update, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );

    if (error) {
      // Duplicate Username sauber melden
      const code = (error as any)?.code;
      const message = String((error as any)?.message ?? '');
      const isUniqueViolation = code === '23505' || /duplicate key value violates unique constraint/i.test(message);
      const hitsUsernameIndex =
        /profiles_username/i.test(message) ||
        /idx_profiles_username_ci/i.test(message) ||
        /username/i.test(message);

      if (isUniqueViolation && hitsUsernameIndex && 'username' in update && update.username) {
        return NextResponse.json(
          { ok: false, error: 'username_taken' },
          { status: 409 }
        );
      }

      console.error('[profile update] db:', error);
      return NextResponse.json(
        {
          ok: false,
          error: 'db',
          message,
          details: (error as any)?.details ?? null,
          hint: (error as any)?.hint ?? null,
          code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[profile update] fatal:', e);
    return NextResponse.json({ ok: false, error: 'fatal', message: String(e?.message ?? e) }, { status: 500 });
  }
}
