export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'default-no-store'

import Link from 'next/link'

import {
  supabaseAdmin,
} from '@/lib/supabase-admin'

import styles from '../admin.module.css'

type ConversationRow = {
  id: string
  type: 'user' | 'support'
  created_at: string
  last_message_at: string | null
  last_message_id: string | null
  closed_at: string | null
}

type ParticipantRow = {
  conversation_id: string
  user_id: string | null
  role: string
  display_name_snapshot: string | null
  left_at: string | null
}

type MessageRow = {
  id: string
  content: string | null
  message_type: string
  created_at: string
}

type ReportRow = {
  id: string
  conversation_id: string
  status: string
  created_at: string
}

function formatDate(
  value:
    | string
    | null
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
    }
  ).format(date)
}

function buildConversationName(
  conversation:
    ConversationRow,
  participants:
    ParticipantRow[]
) {
  const active =
    participants.filter(
      (participant) =>
        participant.left_at ===
        null
    )

  if (
    conversation.type ===
    'support'
  ) {
    const member =
      active.find(
        (participant) =>
          participant.role ===
          'member'
      )

    return `Support · ${
      member
        ?.display_name_snapshot ||
      'Nutzer'
    }`
  }

  const names =
    active
      .filter(
        (participant) =>
          participant.role ===
          'member'
      )
      .map(
        (participant) =>
          participant
            .display_name_snapshot ||
          'Nutzer'
      )

  if (
    names.length === 0
  ) {
    return 'Direktchat'
  }

  return names.join(
    ' ↔ '
  )
}

function getPreview(
  message:
    | MessageRow
    | undefined
) {
  if (!message) {
    return 'Noch keine Nachricht'
  }

  if (
    message.message_type ===
    'file'
  ) {
    return message.content
      ? message.content
      : 'Dateianhang'
  }

  if (
    message.message_type ===
    'system'
  ) {
    return (
      message.content ||
      'Systemnachricht'
    )
  }

  if (
    message.message_type ===
    'context'
  ) {
    return (
      message.content ||
      'Kontext'
    )
  }

  return (
    message.content ||
    'Nachricht'
  )
}

export default async function AdminMessagesPage() {
  const admin =
    supabaseAdmin()

  // =====================================================
  // 1) CONVERSATIONS
  // =====================================================

  const {
    data:
      conversationsData,
    error:
      conversationsError,
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
        last_message_id,
        closed_at
      `)
      .order(
        'last_message_at',
        {
          ascending: false,
          nullsFirst: false,
        }
      )
      .order(
        'created_at',
        {
          ascending: false,
        }
      )

  if (
    conversationsError
  ) {
    console.error(
      '[admin/messages] conversations:',
      conversationsError
    )
  }

  const conversations =
    (
      conversationsData ??
      []
    ) as ConversationRow[]

  const conversationIds =
    conversations.map(
      (conversation) =>
        conversation.id
    )

  // =====================================================
  // 2) PARTICIPANTS
  // =====================================================

  let participants:
    ParticipantRow[] = []

  if (
    conversationIds.length >
    0
  ) {
    const {
      data,
      error,
    } =
      await admin
        .from(
          'conversation_participants'
        )
        .select(`
          conversation_id,
          user_id,
          role,
          display_name_snapshot,
          left_at
        `)
        .in(
          'conversation_id',
          conversationIds
        )

    if (error) {
      console.error(
        '[admin/messages] participants:',
        error
      )
    } else {
      participants =
        (
          data ??
          []
        ) as ParticipantRow[]
    }
  }

  // =====================================================
  // 3) LETZTE NACHRICHTEN
  // =====================================================

  const lastMessageIds =
    conversations
      .map(
        (conversation) =>
          conversation
            .last_message_id
      )
      .filter(
        (
          value
        ): value is string =>
          Boolean(value)
      )

  let lastMessages:
    MessageRow[] = []

  if (
    lastMessageIds.length >
    0
  ) {
    const {
      data,
      error,
    } =
      await admin
        .from(
          'messages'
        )
        .select(`
          id,
          content,
          message_type,
          created_at
        `)
        .in(
          'id',
          lastMessageIds
        )

    if (error) {
      console.error(
        '[admin/messages] messages:',
        error
      )
    } else {
      lastMessages =
        (
          data ??
          []
        ) as MessageRow[]
    }
  }

  // =====================================================
  // 4) OFFENE / IN PRÜFUNG BEFINDLICHE MELDUNGEN
  // =====================================================

  let activeReports:
    ReportRow[] = []

  if (
    conversationIds.length >
    0
  ) {
    const {
      data,
      error,
    } =
      await admin
        .from(
          'chat_reports'
        )
        .select(`
          id,
          conversation_id,
          status,
          created_at
        `)
        .in(
          'conversation_id',
          conversationIds
        )
        .in(
          'status',
          [
            'open',
            'reviewing',
          ]
        )
        .order(
          'created_at',
          {
            ascending: false,
          }
        )

    if (error) {
      console.error(
        '[admin/messages] reports:',
        error
      )
    } else {
      activeReports =
        (
          data ??
          []
        ) as ReportRow[]
    }
  }

  // =====================================================
  // 5) MAPS
  // =====================================================

  const participantsByConversation =
    new Map<
      string,
      ParticipantRow[]
    >()

  for (
    const participant
    of participants
  ) {
    const current =
      participantsByConversation.get(
        participant
          .conversation_id
      ) ?? []

    current.push(
      participant
    )

    participantsByConversation.set(
      participant
        .conversation_id,
      current
    )
  }

  const messageById =
    new Map<
      string,
      MessageRow
    >(
      lastMessages.map(
        (message) => [
          message.id,
          message,
        ]
      )
    )

  const reportsByConversation =
    new Map<
      string,
      ReportRow[]
    >()

  for (
    const report
    of activeReports
  ) {
    const current =
      reportsByConversation.get(
        report.conversation_id
      ) ?? []

    current.push(
      report
    )

    reportsByConversation.set(
      report.conversation_id,
      current
    )
  }

  // =====================================================
  // 6) STATISTIK
  // =====================================================

  const directCount =
    conversations.filter(
      (conversation) =>
        conversation.type ===
        'user'
    ).length

  const supportCount =
    conversations.filter(
      (conversation) =>
        conversation.type ===
        'support'
    ).length

  const reportedConversationCount =
    reportsByConversation.size

  const activeReportCount =
    activeReports.length

  // =====================================================
  // 7) UI
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
          Admin · Nachrichten
        </h1>

        <p
          className={
            styles.heroText
          }
        >
          Übersicht über
          Direkt- und
          Support-Unterhaltungen.
          Das Öffnen hier verändert
          keinen Lesestatus der Nutzer.
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
              Gesamt
            </div>

            <div
              className={
                styles.kpiValue
              }
            >
              {
                conversations.length
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
              Direktchats
            </div>

            <div
              className={
                styles.kpiValue
              }
            >
              {
                directCount
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
              Supportchats
            </div>

            <div
              className={
                styles.kpiValue
              }
            >
              {
                supportCount
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
              Aktive Meldungen
            </div>

            <div
              className={
                styles.kpiValue
              }
            >
              {
                activeReportCount
              }
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
          href="/admin/messages/reports"
          className={
            styles.linkBtn
          }
        >
          Meldungen verwalten
          {activeReportCount > 0
            ? ` (${activeReportCount})`
            : ''}
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
            Alle Unterhaltungen
          </h2>

          {reportedConversationCount >
            0 && (
            <span>
              {
                reportedConversationCount
              }{' '}
              Unterhaltung
              {reportedConversationCount ===
              1
                ? ''
                : 'en'}{' '}
              mit aktiver Meldung
            </span>
          )}
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
                  Unterhaltung
                </th>

                <th
                  className={
                    styles.th
                  }
                >
                  Typ
                </th>

                <th
                  className={
                    styles.th
                  }
                >
                  Letzte Nachricht
                </th>

                <th
                  className={
                    styles.th
                  }
                >
                  Zeitpunkt
                </th>

                <th
                  className={
                    styles.th
                  }
                >
                  Meldung
                </th>

                <th
                  className={
                    styles.th
                  }
                >
                  Status
                </th>

                <th
                  className={
                    styles.th
                  }
                >
                  Aktion
                </th>
              </tr>
            </thead>

            <tbody>
              {conversations.map(
                (
                  conversation
                ) => {
                  const conversationParticipants =
                    participantsByConversation.get(
                      conversation.id
                    ) ??
                    []

                  const lastMessage =
                    conversation
                      .last_message_id
                      ? messageById.get(
                          conversation
                            .last_message_id
                        )
                      : undefined

                  const name =
                    buildConversationName(
                      conversation,
                      conversationParticipants
                    )

                  const reports =
                    reportsByConversation.get(
                      conversation.id
                    ) ??
                    []

                  const openReports =
                    reports.filter(
                      (report) =>
                        report.status ===
                        'open'
                    )

                  const reviewingReports =
                    reports.filter(
                      (report) =>
                        report.status ===
                        'reviewing'
                    )

                  const reportCount =
                    reports.length

                  return (
                    <tr
                      key={
                        conversation.id
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
                        <strong>
                          {name}
                        </strong>

                        <div
                          className={
                            styles.id
                          }
                        >
                          {
                            conversation.id
                          }
                        </div>
                      </td>

                      <td
                        className={
                          styles.td
                        }
                      >
                        {conversation.type ===
                        'support'
                          ? 'Support'
                          : 'Direkt'}
                      </td>

                      <td
                        className={
                          styles.td
                        }
                        style={{
                          maxWidth:
                            360,
                        }}
                      >
                        <div
                          style={{
                            overflow:
                              'hidden',
                            whiteSpace:
                              'nowrap',
                            textOverflow:
                              'ellipsis',
                          }}
                        >
                          {getPreview(
                            lastMessage
                          )}
                        </div>
                      </td>

                      <td
                        className={`${styles.td} ${styles.nowrap}`}
                      >
                        {formatDate(
                          conversation
                            .last_message_at ??
                            conversation
                              .created_at
                        )}
                      </td>

                      <td
                        className={
                          styles.td
                        }
                      >
                        {reportCount ===
                        0 ? (
                          <span
                            style={{
                              color:
                                '#6b7280',
                            }}
                          >
                            —
                          </span>
                        ) : (
                          <div
                            style={{
                              display:
                                'flex',
                              flexDirection:
                                'column',
                              gap: 5,
                              alignItems:
                                'flex-start',
                            }}
                          >
                            {openReports.length >
                              0 && (
                              <span
                                className={`${styles.badge} ${styles.badgeWarn}`}
                              >
                                {
                                  openReports.length
                                }{' '}
                                offen
                              </span>
                            )}

                            {reviewingReports.length >
                              0 && (
                              <span
                                className={
                                  styles.badge
                                }
                              >
                                {
                                  reviewingReports.length
                                }{' '}
                                in Prüfung
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td
                        className={
                          styles.td
                        }
                      >
                        {conversation.closed_at ? (
                          <span
                            className={`${styles.badge} ${styles.badgeWarn}`}
                          >
                            geschlossen
                          </span>
                        ) : (
                          <span
                            className={`${styles.badge} ${styles.badgeOk}`}
                          >
                            offen
                          </span>
                        )}
                      </td>

                      <td
                        className={
                          styles.td
                        }
                      >
                        <div
                          style={{
                            display:
                              'flex',
                            flexDirection:
                              'column',
                            gap: 6,
                            alignItems:
                              'flex-start',
                          }}
                        >
                          <Link
                            href={`/admin/messages/${conversation.id}`}
                            className={
                              styles.linkBtn
                            }
                          >
                            Öffnen
                          </Link>

                          {reportCount >
                            0 && (
                            <Link
                              href="/admin/messages/reports"
                              style={{
                                fontSize:
                                  '0.8rem',
                                color:
                                  '#b45309',
                                fontWeight:
                                  600,
                                textDecoration:
                                  'none',
                              }}
                            >
                              Meldung prüfen →
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                }
              )}

              {conversations.length ===
                0 && (
                <tr>
                  <td
                    className={
                      styles.td
                    }
                    colSpan={
                      7
                    }
                    style={{
                      textAlign:
                        'center',
                      color:
                        '#6b7280',
                    }}
                  >
                    Noch keine
                    Unterhaltungen
                    vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}