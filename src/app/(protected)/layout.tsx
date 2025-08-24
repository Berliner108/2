// app/(protected)/layout.tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  // ⬅️ FIX: cookies() awaiten
  const cookieStore = await cookies()

  const supabase = createServerClient(url, anon, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      // In einem Layout nichts setzen/entfernen (read-only)
      set: () => {},
      remove: () => {},
    },
  })

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    // Einfach zum Login; die Middleware hängt ?redirect=... bei Direktaufrufen an.
    redirect('/login')
  }

  return <>{children}</>
}
