// /src/lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js'

/** Serverseitiger Supabase-Client (Service-Role). Niemals im Browser importieren. */
export function supabaseAdmin() {
  const url =
    process.env.SUPABASE_URL ||            // bevorzugt server-only
    process.env.NEXT_PUBLIC_SUPABASE_URL   // fallback
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'admin-server' } },
  })
}
