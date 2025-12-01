// /src/app/admin/loeschanfragen/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Navbar from '../../components/navbar/Navbar'
import styles from './loeschanfragen.module.css'

type DeleteStatus = 'open' | 'rejected' | 'done'

type AdminDeleteRequest = {
  id: string
  status: DeleteStatus
  reason: string | null
  admin_note: string | null
  created_at: string
  updated_at: string
  user_id: string
  user_email: string | null
}

type ApiListResponse = {
  items: AdminDeleteRequest[]
  message?: string
  error?: string
}

const MAX_ADMIN_NOTE = 500

const AdminLoeschanfragenPage = () => {
  const [requests, setRequests] = useState<AdminDeleteRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // lokale Admin-Notizen pro Zeile
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const loadRequests = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch('/api/admin/delete-requests', { cache: 'no-store' })
      const json: ApiListResponse = await res.json()

      if (!res.ok) {
        setError(json.message || json.error || 'Löschanfragen konnten nicht geladen werden.')
        return
      }

      setRequests(json.items || [])

      // vorhandene admin_note als Startwert in den Textareas
      const nextNotes: Record<string, string> = {}
      for (const r of json.items || []) {
        nextNotes[r.id] = r.admin_note || ''
      }
      setNotes(nextNotes)
    } catch {
      setError('Netzwerkfehler beim Laden der Löschanfragen.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString()
    } catch {
      return iso
    }
  }

  const onChangeNote = (id: string, value: string) => {
    if (value.length > MAX_ADMIN_NOTE) value = value.slice(0, MAX_ADMIN_NOTE)
    setNotes(prev => ({ ...prev, [id]: value }))
  }

  const rejectRequest = async (id: string) => {
    const note = (notes[id] || '').trim()

    if (!confirm('Löschanfrage wirklich als "abgelehnt" markieren?')) return

    try {
      setSavingId(id)
      setError(null)

      const res = await fetch(`/api/admin/delete-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'rejected',
          admin_note: note || null,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json?.message || json?.error || 'Fehler beim Aktualisieren der Löschanfrage.')
        return
      }

      // Liste neu laden, damit Status sofort aktualisiert ist
      await loadRequests()
    } catch {
      setError('Netzwerkfehler beim Aktualisieren der Löschanfrage.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <h1 className={styles.title}>Löschanfragen (Admin)</h1>

        <p className={styles.lead}>
          Hier siehst du alle Nutzer, die eine Löschanfrage gestellt haben.
          Du kannst Anfragen ablehnen und einen Grund hinterlegen.
          Das endgültige Löschen des Users machst du wie gewohnt im Admin-Bereich / in Supabase.
        </p>

        <div className={styles.topBar}>
          <button
            type="button"
            onClick={loadRequests}
            disabled={loading}
            className={styles.reloadBtn}
          >
            {loading ? 'Aktualisiere…' : 'Neu laden'}
          </button>
        </div>

        {error && (
          <div className={styles.errorBox}>
            {error}
          </div>
        )}

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            Löschanfragen
          </div>

          <div className={styles.cardBody}>
            {loading && <div className={styles.loadingText}>Lade…</div>}

            {!loading && requests.length === 0 && !error && (
              <div className={styles.emptyText}>Keine Löschanfragen gefunden.</div>
            )}

            {!loading && requests.length > 0 && (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Nutzer</th>
                    <th className={styles.th}>Grund (User)</th>
                    <th className={styles.th}>Admin-Notiz</th>
                    <th className={styles.th}>Status</th>
                    <th className={styles.th}>Erstellt</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => {
                    const note = notes[r.id] ?? ''
                    const isOpen = r.status === 'open'
                    const charsLeft = MAX_ADMIN_NOTE - note.length

                    return (
                      <tr key={r.id} className={styles.trRow}>
                        {/* Nutzer */}
                        <td className={`${styles.td} ${styles.tdUser}`}>
                          <div className={styles.userMain}>
                            {r.user_email || '—'}
                          </div>
                          <div className={styles.userSub}>
                            User-ID: {r.user_id}
                          </div>
                          <div className={styles.userSubMuted}>
                            Request-ID: {r.id}
                          </div>
                        </td>

                        {/* Grund (User) */}
                        <td className={styles.td}>
                          <div className={styles.reasonText}>
                            {r.reason || (
                              <span className={styles.muted}>kein Grund angegeben</span>
                            )}
                          </div>
                        </td>

                        {/* Admin-Notiz + Ablehnen */}
                        <td className={styles.td}>
                          <textarea
                            value={note}
                            onChange={(e) => onChangeNote(r.id, e.target.value)}
                            rows={3}
                            className={styles.noteTextarea}
                            placeholder="z. B. 'Daten müssen aus steuerlichen Gründen vorerst behalten werden.'"
                            maxLength={MAX_ADMIN_NOTE}
                          />
                          <div className={styles.noteMetaRow}>
                            <span className={styles.noteCounter}>{charsLeft} Zeichen übrig</span>

                            {isOpen ? (
                              <button
                                type="button"
                                onClick={() => rejectRequest(r.id)}
                                disabled={savingId === r.id}
                                className={styles.noteActionBtn}
                              >
                                {savingId === r.id
                                  ? 'Lehne ab…'
                                  : 'Als abgelehnt markieren'}
                              </button>
                            ) : (
                              <span className={styles.noteBadge}>
                                Bereits {r.status === 'rejected'
                                  ? 'abgelehnt'
                                  : 'abgeschlossen'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className={styles.td}>
                          <span
                            className={`${styles.statusBadge} ${
                              r.status === 'open'
                                ? styles.statusOpen
                                : r.status === 'done'
                                ? styles.statusDone
                                : styles.statusRejected
                            }`}
                          >
                            {r.status === 'open' && 'Offen'}
                            {r.status === 'done' && 'Abgeschlossen'}
                            {r.status === 'rejected' && 'Abgelehnt'}
                          </span>
                        </td>

                        {/* Datum */}
                        <td className={`${styles.td} ${styles.tdDate}`}>
                          {formatDate(r.created_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </>
  )
}

export default AdminLoeschanfragenPage
