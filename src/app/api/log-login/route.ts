// src/app/api/log-login/route.ts
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import crypto from 'crypto'
import { supabaseServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function ipToPrefix(ipRaw: string): string {
  const ip = (ipRaw || '').trim()
  // sehr simple Erkennung
  if (ip.includes(':')) {
    // IPv6 → /48
    const parts = ip.split(':').map(p => p || '0')
    return parts.slice(0, 3).join(':') + '::/48'
  } else {
    // IPv4 → /24
    const [a = '0', b = '0', c = '0'] = ip.split('.')
    return `${a}.${b}.${c}.0/24`
  }
}

function hashPrefixedIp(ipRaw: string): string {
  const salt = process.env.IP_HASH_SALT || 'change-me'
  const prefix = ipToPrefix(ipRaw)
  return crypto.createHmac('sha256', salt).update(prefix).digest('hex')
}

export async function POST() {
  const sb = await supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const h = await headers()
  const fwd = h.get('x-forwarded-for') || ''
  const ip =
    fwd.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    '0.0.0.0'

  const ua = (h.get('user-agent') || '').slice(0, 200)
  const ip_hash = hashPrefixedIp(String(ip))

  const { error } = await sb.from('user_login_events').insert({
    user_id: user.id,
    ip_hash,
    user_agent: ua,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
