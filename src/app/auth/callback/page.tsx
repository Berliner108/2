// src/app/auth/callback/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function AuthCallback() {
  const [msg, setMsg] = useState('Bitte warten…')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    (async () => {
      const supabase = supabaseBrowser()

      // toString() liefert den kompletten Query-String ohne "?"
      const queryString = searchParams.toString()

      const { error } = await supabase.auth.exchangeCodeForSession(queryString)
      if (error) {
        setMsg('Fehler: ' + error.message)
        return
      }

      const flow = searchParams.get('flow')
      if (flow === 'reset') {
        router.replace(
          '/auth/new-password?redirect=' +
            encodeURIComponent(searchParams.get('redirect') ?? '/')
        )
        return
      }

      setMsg('E-Mail bestätigt. Weiterleiten…')
      router.replace(searchParams.get('redirect') ?? '/')
    })()
  }, [router, searchParams])

  return <p className="p-6 text-center">{msg}</p>
}
