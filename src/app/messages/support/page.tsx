'use client'

import {
  useEffect,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import styles from '../messages.module.css'

export default function SupportPage() {
  const router =
    useRouter()

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    )

  useEffect(() => {
    let cancelled = false

    const openSupport =
      async () => {
        try {
          const res =
            await fetch(
              '/api/messages/support/start',
              {
                method: 'POST',
                credentials:
                  'include',
                headers: {
                  'Content-Type':
                    'application/json',
                },
                body: JSON.stringify({
                  create: false,
                }),
              }
            )

          const json =
            await res
              .json()
              .catch(
                () => null
              )

          if (cancelled) {
            return
          }

          if (
            !res.ok ||
            !json?.ok
          ) {
            setError(
              json?.message ||
                'Support-Chat konnte nicht geöffnet werden.'
            )
            return
          }

          if (json.conversationId) {
            router.replace(
              `/messages/${json.conversationId}`
            )
            return
          }

          if (json.ready) {
            router.replace(
              '/messages/new?support=1&displayName=Beschichter%20Scout%20Support'
            )
            return
          }

          setError(
            'Support-Chat konnte nicht geöffnet werden.'
          )
        } catch {
          if (!cancelled) {
            setError(
              'Support-Chat konnte nicht geöffnet werden.'
            )
          }
        }
      }

    void openSupport()

    return () => {
      cancelled = true
    }
  }, [router])

  return (
    <div
      className={
        styles.emptyConversation
      }
    >
      {error ??
        'Support-Chat wird geöffnet …'}
    </div>
  )
}