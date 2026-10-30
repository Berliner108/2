'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import styles from './messages.module.css'

type Conversation = {
  id: string
  type: 'user' | 'support'
  displayName: string
  unreadCount: number
  lastMessageAt: string | null

  lastMessage: {
    id: string
    message_type: string
    content: string | null
    created_at: string
  } | null
}

export default function Sidebar() {
  const pathname = usePathname()

  const [conversations, setConversations] =
    useState<Conversation[]>([])

  const [loading, setLoading] = useState(true)

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/messages', {
        cache: 'no-store',
        credentials: 'include',
      })

      const json = await res.json().catch(() => null)

      if (!res.ok || !json?.ok) {
        return
      }

      setConversations(
        Array.isArray(json.conversations)
          ? json.conversations
          : []
      )
    } catch (error) {
      console.error(
        '[messages/sidebar] load failed:',
        error
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadConversations()

    const refresh = () => {
      void loadConversations()
    }

    window.addEventListener(
      'chat:refresh',
      refresh
    )

    return () => {
      window.removeEventListener(
        'chat:refresh',
        refresh
      )
    }
  }, [loadConversations])

  return (
    <aside className={styles.sidebar}>
      <h2>Nachrichten</h2>

      {loading ? (
        <div className={styles.sidebarInfo}>
          Wird geladen …
        </div>
      ) : conversations.length === 0 ? (
        <div className={styles.sidebarInfo}>
          Noch keine Nachrichten.
        </div>
      ) : (
        <nav>
          <ul>
            {conversations.map((chat) => {
              const href =
                `/messages/${chat.id}`

              const active =
                pathname === href

              let preview =
                chat.lastMessage?.content?.trim()

              if (
                !preview &&
                chat.lastMessage?.message_type ===
                  'file'
              ) {
                preview = 'Datei gesendet'
              }

              if (!preview) {
                preview = 'Neue Unterhaltung'
              }

              return (
                <li
                  key={chat.id}
                  className={
                    active
                      ? styles.sidebarConversationActive
                      : styles.sidebarConversation
                  }
                >
                  <Link
                    href={href}
                    className={styles.sidebarLink}
                  >
                    <div
                      className={
                        styles.sidebarConversationTop
                      }
                    >
                      <strong>
                        {chat.displayName}
                      </strong>

                      {chat.unreadCount > 0 && (
                        <span
                          className={
                            styles.sidebarUnread
                          }
                        >
                          {chat.unreadCount > 99
                            ? '99+'
                            : chat.unreadCount}
                        </span>
                      )}
                    </div>

                    <small
                      className={
                        styles.sidebarPreview
                      }
                    >
                      {preview}
                    </small>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      )}
    </aside>
  )
}