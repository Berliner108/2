'use client'

import {
  useEffect,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import styles from './messages.module.css'

export default function MessagesPage() {
  const router = useRouter()

  const [empty, setEmpty] =
    useState(false)

  useEffect(() => {
    let cancelled = false

    const openNewestConversation =
      async () => {
        try {
          const res = await fetch(
            '/api/messages',
            {
              cache: 'no-store',
              credentials: 'include',
            }
          )

          const json =
            await res
              .json()
              .catch(() => null)

          if (
            cancelled ||
            !res.ok ||
            !json?.ok
          ) {
            return
          }

          const conversations =
            Array.isArray(
              json.conversations
            )
              ? json.conversations
              : []

          if (
            conversations.length > 0
          ) {
            router.replace(
              `/messages/${conversations[0].id}`
            )

            return
          }

          setEmpty(true)
        } catch (error) {
          console.error(
            '[messages/root] load:',
            error
          )
        }
      }

    void openNewestConversation()

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
      {empty
        ? 'Noch keine Unterhaltung vorhanden.'
        : 'Nachrichten werden geladen …'}
    </div>
  )
}