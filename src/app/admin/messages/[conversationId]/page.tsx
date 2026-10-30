export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'default-no-store'

import Link from 'next/link'
import { notFound } from 'next/navigation'

import { supabaseAdmin } from '@/lib/supabase-admin'

import styles from '../../admin.module.css'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

type ConversationRow = {
  id: string
  type: 'user' | 'support'
  created_at: string
  last_message_at: string | null
  closed_at: string | null
}

type ParticipantRow = {
  id: string
  conversation_id: string
  user_id: string | null
  role: string
  display_name_snapshot: string | null
  left_at: string | null
}

type AttachmentRow = {
  id: string
  original_filename: string
  mime_type: string
  file_extension: string
  file_size: number
}

type MessageRow = {
  id: string
  sender_participant_id: string | null
  message_type:
    | 'text'
    | 'file'
    | 'system'
    | 'context'
  content: string | null
  created_at: string
  message_attachments?: AttachmentRow[]
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return '—'
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '—'
  }

  return new Intl.DateTimeFormat(
    'de-AT',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }
  ).format(date)
}

function formatFileSize(
  bytes: number
) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`
}

function getParticipantName(
  participant:
    | ParticipantRow
    | undefined
) {
  if (!participant) {
    return 'Unbekannt'
  }

  if (
    participant.role ===
    'support'
  ) {
    return 'Beschichter Scout Support'
  }

  return (
    participant.display_name_snapshot ||
    'Nutzer'
  )
}

export default async function AdminMessageDetailPage({
  params,
}: {
  params: Promise<{
    conversationId: string
  }>
}) {
  const {
    conversationId,
  } = await params

  if (
    !conversationId ||
    !isUuid(conversationId)
  ) {
    notFound()
  }

  const admin =
    supabaseAdmin()

  // =====================================================
  // 1) CONVERSATION
  // =====================================================

  const {
    data:
      conversationData,
    error:
      conversationError,
  } =
    await admin
      .from(
        'conversations'
      )
      .select(`
        id,
        type,
        created_at,
        last_message_at,
        closed_at
      `)
      .eq(
        'id',
        conversationId
      )
      .maybeSingle()

  if (
    conversationError
  ) {
    console.error(
      '[admin/messages/detail] conversation:',
      conversationError
    )
  }

  if (
    !conversationData
  ) {
    notFound()
  }

  const conversation =
    conversationData as ConversationRow

  // =====================================================
  // 2) PARTICIPANTS
  // =====================================================

  const {
    data:
      participantsData,
    error:
      participantsError,
  } =
    await admin
      .from(
        'conversation_participants'
      )
      .select(`
        id,
        conversation_id,
        user_id,
        role,
        display_name_snapshot,
        left_at
      `)
      .eq(
        'conversation_id',
        conversationId
      )

  if (
    participantsError
  ) {
    console.error(
      '[admin/messages/detail] participants:',
      participantsError
    )
  }

  const participants =
    (
      participantsData ??
      []
    ) as ParticipantRow[]

  const participantById =
    new Map<
      string,
      ParticipantRow
    >(
      participants.map(
        (participant) => [
          participant.id,
          participant,
        ]
      )
    )

  // =====================================================
  // 3) MESSAGES
  // =====================================================

  const {
    data:
      messagesData,
    error:
      messagesError,
  } =
    await admin
      .from(
        'messages'
      )
      .select(`
        id,
        sender_participant_id,
        message_type,
        content,
        created_at,
        message_attachments (
          id,
          original_filename,
          mime_type,
          file_extension,
          file_size
        )
      `)
      .eq(
        'conversation_id',
        conversationId
      )
      .order(
        'created_at',
        {
          ascending: true,
        }
      )
      .order(
        'id',
        {
          ascending: true,
        }
      )

  if (
    messagesError
  ) {
    console.error(
      '[admin/messages/detail] messages:',
      messagesError
    )
  }

  const messages =
    (
      messagesData ??
      []
    ) as MessageRow[]

  // =====================================================
  // 4) TITEL
  // =====================================================

  const memberNames =
    participants
      .filter(
        (participant) =>
          participant.role ===
            'member' &&
          participant.left_at ===
            null
      )
      .map(
        (participant) =>
          participant
            .display_name_snapshot ||
          'Nutzer'
      )

  const title =
    conversation.type ===
    'support'
      ? `Support · ${
          memberNames[0] ||
          'Nutzer'
        }`
      : memberNames.length >
          0
        ? memberNames.join(
            ' ↔ '
          )
        : 'Direktchat'

  // =====================================================
  // 5) UI
  // =====================================================

  return (
    <div
      className={
        styles.wrapper
      }
    >
      <section
        className={
          styles.hero
        }
      >
        <h1
          className={
            styles.heroTitle
          }
        >
          {title}
        </h1>

        <p
          className={
            styles.heroText
          }
        >
          Admin-Leseansicht. Dein
          Admin-Konto wird nicht als
          Teilnehmer hinzugefügt und
          der Lesestatus der Nutzer
          bleibt unverändert.
        </p>

        <div
          className={
            styles.kpiGrid
          }
        >
          <div
            className={
              styles.kpiCard
            }
          >
            <div
              className={
                styles.kpiTop
              }
            >
              Typ
            </div>

            <div
              className={
                styles.kpiValue
              }
            >
              {conversation.type ===
              'support'
                ? 'Support'
                : 'Direkt'}
            </div>
          </div>

          <div
            className={
              styles.kpiCard
            }
          >
            <div
              className={
                styles.kpiTop
              }
            >
              Nachrichten
            </div>

            <div
              className={
                styles.kpiValue
              }
            >
              {
                messages.length
              }
            </div>
          </div>

          <div
            className={
              styles.kpiCard
            }
          >
            <div
              className={
                styles.kpiTop
              }
            >
              Status
            </div>

            <div
              className={
                styles.kpiValue
              }
            >
              {conversation.closed_at
                ? 'Geschlossen'
                : 'Offen'}
            </div>
          </div>
        </div>

        <div
          className={
            styles.heroBlurA
          }
        />

        <div
          className={
            styles.heroBlurB
          }
        />
      </section>

      <div
        className={
          styles.actions
        }
      >
        <Link
          href="/admin/messages"
          className={
            styles.linkBtn
          }
        >
          ← Zur Übersicht
        </Link>
      </div>

      <section
        className={
          styles.section
        }
      >
        <div
          className={
            styles.sectionHead
          }
        >
          <h2>
            Teilnehmer
          </h2>
        </div>

        <div
          className={
            styles.tableWrap
          }
        >
          <table
            className={
              styles.table
            }
          >
            <thead
              className={
                styles.thead
              }
            >
              <tr>
                <th
                  className={
                    styles.th
                  }
                >
                  Name
                </th>

                <th
                  className={
                    styles.th
                  }
                >
                  Rolle
                </th>

                <th
                  className={
                    styles.th
                  }
                >
                  User-ID
                </th>

                <th
                  className={
                    styles.th
                  }
                >
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {participants.map(
                (
                  participant
                ) => (
                  <tr
                    key={
                      participant.id
                    }
                    className={
                      styles.tr
                    }
                  >
                    <td
                      className={
                        styles.td
                      }
                    >
                      {getParticipantName(
                        participant
                      )}
                    </td>

                    <td
                      className={
                        styles.td
                      }
                    >
                      {
                        participant.role
                      }
                    </td>

                    <td
                      className={
                        styles.td
                      }
                    >
                      <span
                        className={
                          styles.id
                        }
                      >
                        {
                          participant.user_id ??
                          '—'
                        }
                      </span>
                    </td>

                    <td
                      className={
                        styles.td
                      }
                    >
                      {participant.left_at ? (
                        <span
                          className={`${styles.badge} ${styles.badgeWarn}`}
                        >
                          verlassen
                        </span>
                      ) : (
                        <span
                          className={`${styles.badge} ${styles.badgeOk}`}
                        >
                          aktiv
                        </span>
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className={
          styles.section
        }
      >
        <div
          className={
            styles.sectionHead
          }
        >
          <h2>
            Nachrichtenverlauf
          </h2>

          <span>
            Erstellt:{' '}
            {formatDate(
              conversation.created_at
            )}
          </span>
        </div>

        <div
          style={{
            padding: 16,
            display: 'flex',
            flexDirection:
              'column',
            gap: 12,
          }}
        >
          {messages.map(
            (message) => {
              const sender =
                message.sender_participant_id
                  ? participantById.get(
                      message.sender_participant_id
                    )
                  : undefined

              return (
                <div
                  key={
                    message.id
                  }
                  style={{
                    border:
                      '1px solid #e5e7eb',
                    borderRadius: 12,
                    background:
                      '#fff',
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      display:
                        'flex',
                      justifyContent:
                        'space-between',
                      gap: 12,
                      marginBottom:
                        8,
                    }}
                  >
                    <strong>
                      {message.sender_participant_id
                        ? getParticipantName(
                            sender
                          )
                        : 'System'}
                    </strong>

                    <span
                      style={{
                        color:
                          '#6b7280',
                        fontSize:
                          '0.82rem',
                        whiteSpace:
                          'nowrap',
                      }}
                    >
                      {formatDate(
                        message.created_at
                      )}
                    </span>
                  </div>

                  {message.content && (
                    <div
                      style={{
                        whiteSpace:
                          'pre-wrap',
                        overflowWrap:
                          'anywhere',
                      }}
                    >
                      {
                        message.content
                      }
                    </div>
                  )}

                  {message
                    .message_attachments
                    ?.map(
                      (
                        attachment
                      ) => (
                        <a
                          key={
                            attachment.id
                          }
                          href={`/api/admin/messages/attachments/${attachment.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display:
                              'block',
                            marginTop:
                              10,
                            padding:
                              '10px 12px',
                            border:
                              '1px solid #e5e7eb',
                            borderRadius:
                              8,
                            background:
                              '#f8fafc',
                            color:
                              '#111827',
                            textDecoration:
                              'none',
                          }}
                        >
                          <strong>
                            {
                              attachment.original_filename
                            }
                          </strong>

                          <div
                            style={{
                              marginTop:
                                3,
                              color:
                                '#6b7280',
                              fontSize:
                                '0.82rem',
                            }}
                          >
                            {formatFileSize(
                              attachment.file_size
                            )}
                            {' · '}
                            {
                              attachment.file_extension
                            }
                            {' · '}
                            Herunterladen
                          </div>
                        </a>
                      )
                    )}

                  <div
                    style={{
                      marginTop:
                        8,
                      color:
                        '#94a3b8',
                      fontSize:
                        '0.72rem',
                    }}
                  >
                    Typ:{' '}
                    {
                      message.message_type
                    }
                  </div>
                </div>
              )
            }
          )}

          {messages.length ===
            0 && (
            <div
              style={{
                padding:
                  24,
                textAlign:
                  'center',
                color:
                  '#6b7280',
              }}
            >
              Noch keine
              Nachrichten vorhanden.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}