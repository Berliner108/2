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
            !json?.ok ||
            !json?.conversationId
          ) {
            setError(
              json?.message ||
                'Support-Chat konnte nicht geöffnet werden.'
            )

            return
          }

          router.replace(
            `/messages/${json.conversationId}`
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