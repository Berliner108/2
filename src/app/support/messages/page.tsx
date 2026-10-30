'use client'

import {
  useCallback,
  useEffect,
  useState,
} from 'react'

import Link from 'next/link'

import Navbar from '../../components/navbar/Navbar'

import styles from './support-messages.module.css'

type SupportConversation = {
  id: string
  displayName: string
  userId: string | null
  preview: string
  lastMessageAt: string
  closed: boolean
}

function formatDate(
  value: string
) {
  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return ''
  }

  return new Intl.DateTimeFormat(
    'de-DE',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  ).format(date)
}

export default function SupportMessagesPage() {
  const [
    conversations,
    setConversations,
  ] =
    useState<
      SupportConversation[]
    >([])

  const [
    loading,
    setLoading,
  ] =
    useState(true)

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    )

  const load =
    useCallback(
      async () => {
        setLoading(true)
        setError(null)

        try {
          const res =
            await fetch(
              '/api/support/messages',
              {
                cache:
                  'no-store',

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

          if (
            !res.ok ||
            !json?.ok
          ) {
            if (
              res.status ===
              403
            ) {
              setError(
                'Du bist nicht als Support-Mitarbeiter freigeschaltet.'
              )
            } else {
              setError(
                'Support-Unterhaltungen konnten nicht geladen werden.'
              )
            }

            return
          }

          setConversations(
            Array.isArray(
              json.conversations
            )
              ? json.conversations
              : []
          )
        } catch (
          error
        ) {
          console.error(
            '[support/messages] load:',
            error
          )

          setError(
            'Support-Unterhaltungen konnten nicht geladen werden.'
          )
        } finally {
          setLoading(false)
        }
      },
      []
    )

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <Navbar />

      <main
        className={
          styles.page
        }
      >
        <div
          className={
            styles.header
          }
        >
          <div>
            <h1>
              Support-Nachrichten
            </h1>

            <p>
              Hier werden ausschließlich
              Support-Unterhaltungen
              angezeigt.
            </p>
          </div>

          <button
            type="button"
            className={
              styles.refreshButton
            }
            onClick={() =>
              void load()
            }
            disabled={
              loading
            }
          >
            Aktualisieren
          </button>
        </div>

        {error && (
          <div
            className={
              styles.error
            }
          >
            {error}
          </div>
        )}

        {loading ? (
          <div
            className={
              styles.loading
            }
          >
            Support-Nachrichten
            werden geladen …
          </div>
        ) : (
          <>
            {conversations.length ===
            0 ? (
              <div
                className={
                  styles.empty
                }
              >
                Aktuell gibt es keine
                Support-Unterhaltungen.
              </div>
            ) : (
              <div
                className={
                  styles.list
                }
              >
                {conversations.map(
                  (
                    conversation
                  ) => (
                    <Link
                      key={
                        conversation.id
                      }
                      href={`/messages/${conversation.id}`}
                      className={
                        styles.item
                      }
                    >
                      <div
                        className={
                          styles.itemTop
                        }
                      >
                        <strong>
                          {
                            conversation.displayName
                          }
                        </strong>

                        <span>
                          {formatDate(
                            conversation.lastMessageAt
                          )}
                        </span>
                      </div>

                      <div
                        className={
                          styles.preview
                        }
                      >
                        {
                          conversation.preview
                        }
                      </div>

                      {conversation.closed && (
                        <div
                          className={
                            styles.closed
                          }
                        >
                          Geschlossen
                        </div>
                      )}
                    </Link>
                  )
                )}
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}