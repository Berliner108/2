'use client'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

export function useRequireAuth() {
  const router = useRouter()
  return async () => {
    const supabase = supabaseBrowser()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      const next = window.location.pathname + window.location.search
      router.push(`/login?redirect=${encodeURIComponent(next)}`)
      return null
    }
    return session
  }
}
