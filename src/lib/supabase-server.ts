// src/lib/supabase-server.ts
import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

/** Server-Client für Server Components / RSC. */
export async function supabaseServer() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error(
      "@supabase/ssr: Your project's URL and API key are required to create a Supabase client!"
    )
  }

  // In deinem Build ist cookies() Promise-typisiert → await
  const cookieStore = await cookies()

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      // In RSC können wir die Response nicht verändern → No-Op
      set(_name: string, _value: string, _opts: CookieOptions) {},
      remove(_name: string, _opts: CookieOptions) {},
    },
  })
}
