export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'default-no-store'

import Link from 'next/link'

import {
  supabaseAdmin,
} from '@/lib/supabase-admin'

import styles from '../../admin.module.css'

type ReportRow = {
  id: string
  conversation_id: string
  reporter_user_id: string | null
  reported_user_id: string | null
  reason: string
  details: string | null
  status: string
  created_at: string
}

type ProfileRow = {
  id: string
  username: string | null
  company_name: string | null
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

function getReasonLabel(
  reason: string
) {
  switch (reason) {
    case 'spam':
      return 'Spam / Werbung'

    case 'beleidigung':
      return 'Beleidigung / Belästigung'

    case 'betrug':
      return 'Betrug / Täuschung'

    case 'unangemessene_inhalte':
      return 'Unangemessene Inhalte'

    case 'sonstiges':
      return 'Sonstiges'

    default:
      return reason
  }
}

function getStatusLabel(
  status: string
) {
  switch (status) {
    case 'open':
      return 'Offen'

    case 'reviewing':
      return 'In Prüfung'

    case 'resolved':
      return 'Erledigt'

    case 'rejected':
      return 'Abgewiesen'

    default:
      return status
  }
}

function getProfileName(
  profile:
    | ProfileRow
    | undefined
) {
  if (!profile) {
    return '—'
  }

  if (
    profile.company_name
  ) {
    return `${profile.username || 'Nutzer'} · ${profile.company_name}`
  }

  return (
    profile.username ||
    'Nutzer'
  )
}

export default async function AdminChatReportsPage() {
  const admin =
    supabaseAdmin()

  // =====================================================
  // 1) MELDUNGEN LADEN
  // =====================================================

  const {
    data:
      reportsData,
    error:
      reportsError,
  } =
    await admin
      .from(
        'chat_reports'
      )
      .select(`
        id,
        conversation_id,
        reporter_user_id,
        reported_user_id,
        reason,
        details,
        status,
        created_at
      `)
      .order(
        'created_at',
        {
          ascending: false,
        }
      )

  if (
    reportsError
  ) {
    console.error(
      '[admin/reports] reports:',
      reportsError
    )
  }

  const reports =
    (
      reportsData ??
      []
    ) as ReportRow[]

  // =====================================================
  // 2) BETEILIGTE USER LADEN
  // =====================================================

  const profileIds =
    Array.from(
      new Set(
        reports
          .flatMap(
            (report) => [
              report.reporter_user_id,
              report.reported_user_id,
            ]
          )
          .filter(
            (
              id
            ): id is string =>
              Boolean(id)
          )
      )
    )

  let profiles:
    ProfileRow[] = []

  if (
    profileIds.length >
    0
  ) {
    const {
      data,
      error,
    } =
      await admin
        .from(
          'profiles'
        )
        .select(`
          id,
          username,
          company_name
        `)
        .in(
          'id',
          profileIds
        )

    if (error) {
      console.error(
        '[admin/reports] profiles:',
        error
      )
    } else {
      profiles =
        (
          data ??
          []
        ) as ProfileRow[]
    }
  }

  const profileById =
    new Map<
      string,
      ProfileRow
    >(
      profiles.map(
        (profile) => [
          profile.id,
          profile,
        ]
      )
    )

  // =====================================================
  // 3) KPIS
  // =====================================================

  const openCount =
    reports.filter(
      (report) =>
        report.status ===
        'open'
    ).length

  const reviewingCount =
    reports.filter(
      (report) =>
        report.status ===
        'reviewing'
    ).length

  const resolvedCount =
    reports.filter(
      (report) =>
        report.status ===
        'resolved'
    ).length

  // =====================================================
  // 4) UI
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
          Admin · Meldungen
        </h1>

        <p
          className={
            styles.heroText
          }
        >
          Gemeldete Unterhaltungen
          und Nutzer prüfen.
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
              Offen
            </div>

            <div
              className={
                styles.kpiValue
              }
            >
              {openCount}
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
              In Prüfung
            </div>

            <div
              className={
                styles.kpiValue
              }
            >
              {reviewingCount}
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
              Erledigt
            </div>

            <div
              className={
                styles.kpiValue
              }
            >
              {resolvedCount}
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
          ← Zu Nachrichten
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
            Alle Meldungen
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
                  Datum
                </th>

                <th
                  className={
                    styles.th
                  }
                >
                  Melder
                </th>

                <th
                  className={
                    styles.th
                  }
                >
                  Gemeldeter Nutzer
                </th>

                <th
                  className={
                    styles.th
                  }
                >
                  Grund
                </th>

                <th
                  className={
                    styles.th
                  }
                >
                  Details
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
              {reports.map(
                (report) => {
                  const reporter =
                    report
                      .reporter_user_id
                      ? profileById.get(
                          report
                            .reporter_user_id
                        )
                      : undefined

                  const reported =
                    report
                      .reported_user_id
                      ? profileById.get(
                          report
                            .reported_user_id
                        )
                      : undefined

                  return (
                    <tr
                      key={
                        report.id
                      }
                      className={
                        styles.tr
                      }
                    >
                      <td
                        className={`${styles.td} ${styles.nowrap}`}
                      >
                        {formatDate(
                          report.created_at
                        )}
                      </td>

                      <td
                        className={
                          styles.td
                        }
                      >
                        {getProfileName(
                          reporter
                        )}

                        {report.reporter_user_id && (
                          <div
                            className={
                              styles.id
                            }
                          >
                            {
                              report.reporter_user_id
                            }
                          </div>
                        )}
                      </td>

                      <td
                        className={
                          styles.td
                        }
                      >
                        {report.reported_user_id
                          ? getProfileName(
                              reported
                            )
                          : 'Support / keine einzelne Person'}

                        {report.reported_user_id && (
                          <div
                            className={
                              styles.id
                            }
                          >
                            {
                              report.reported_user_id
                            }
                          </div>
                        )}
                      </td>

                      <td
                        className={
                          styles.td
                        }
                      >
                        <strong>
                          {getReasonLabel(
                            report.reason
                          )}
                        </strong>
                      </td>

                      <td
                        className={
                          styles.td
                        }
                        style={{
                          maxWidth:
                            320,
                          whiteSpace:
                            'pre-wrap',
                          overflowWrap:
                            'anywhere',
                        }}
                      >
                        {report.details ||
                          '—'}
                      </td>

                      <td
                        className={
                          styles.td
                        }
                      >
                        {report.status ===
                        'resolved' ? (
                          <span
                            className={`${styles.badge} ${styles.badgeOk}`}
                          >
                            {getStatusLabel(
                              report.status
                            )}
                          </span>
                        ) : (
                          <span
                            className={`${styles.badge} ${
                              report.status ===
                              'open'
                                ? styles.badgeWarn
                                : ''
                            }`}
                          >
                            {getStatusLabel(
                              report.status
                            )}
                          </span>
                        )}
                      </td>

                      <td
                        className={
                          styles.td
                        }
                      >
                        <Link
                          href={`/admin/messages/${report.conversation_id}`}
                          className={
                            styles.linkBtn
                          }
                        >
                          Unterhaltung
                          öffnen
                        </Link>
                      </td>
                    </tr>
                  )
                }
              )}

              {reports.length ===
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
                    Keine Meldungen
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