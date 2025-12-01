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
      <main style={{ maxWidth: 1100, margin: '40px auto', padding: '0 16px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>
          Löschanfragen (Admin)
        </h1>

        <p style={{ fontSize: 14, color: '#4b5563', marginBottom: 16 }}>
          Hier siehst du alle Nutzer, die eine Löschanfrage gestellt haben.
          Du kannst Anfragen ablehnen und einen Grund hinterlegen.
          Das endgültige Löschen des Users machst du wie gewohnt im Admin-Bereich / in Supabase.
        </p>

        <div style={{ marginBottom: 12 }}>
          <button
            type="button"
            onClick={loadRequests}
            disabled={loading}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              background: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 14,
            }}
          >
            {loading ? 'Aktualisiere…' : 'Neu laden'}
          </button>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: '8px 10px',
              borderRadius: 10,
              border: '1px solid #fee2e2',
              background: '#fef2f2',
              color: '#b91c1c',
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            overflow: 'hidden',
            background: '#ffffff',
          }}
        >
          <div
            style={{
              padding: 12,
              borderBottom: '1px solid #e5e7eb',
              background: '#f9fafb',
              fontWeight: 600,
            }}
          >
            Löschanfragen
          </div>

          <div style={{ padding: 12 }}>
            {loading && <div style={{ color: '#6b7280' }}>Lade…</div>}

            {!loading && requests.length === 0 && !error && (
              <div style={{ color: '#6b7280' }}>Keine Löschanfragen gefunden.</div>
            )}

            {!loading && requests.length > 0 && (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 8 }}>Nutzer</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Grund (User)</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Admin-Notiz</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Status</th>
                    <th style={{ textAlign: 'left', padding: 8 }}>Erstellt</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => {
                    const note = notes[r.id] ?? ''
                    const isOpen = r.status === 'open'
                    const charsLeft = MAX_ADMIN_NOTE - note.length

                    return (
                      <tr key={r.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                        {/* Nutzer */}
                        <td style={{ padding: 8, verticalAlign: 'top', maxWidth: 220 }}>
                          <div style={{ fontWeight: 500 }}>
                            {r.user_email || '—'}
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>
                            User-ID: {r.user_id}
                          </div>
                          <div style={{ fontSize: 12, color: '#9ca3af' }}>
                            Request-ID: {r.id}
                          </div>
                        </td>

                        {/* Grund (User) */}
                        <td style={{ padding: 8, verticalAlign: 'top', maxWidth: 260 }}>
                          <div
                            style={{
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}
                          >
                            {r.reason || (
                              <span style={{ color: '#9ca3af' }}>kein Grund angegeben</span>
                            )}
                          </div>
                        </td>

                        {/* Admin-Notiz + Ablehnen */}
                        <td style={{ padding: 8, verticalAlign: 'top', maxWidth: 260 }}>
                          <textarea
                            value={note}
                            onChange={(e) => onChangeNote(r.id, e.target.value)}
                            rows={3}
                            style={{
                              width: '100%',
                              resize: 'vertical',
                              padding: 6,
                              borderRadius: 8,
                              border: '1px solid #e5e7eb',
                              fontSize: 13,
                              fontFamily: 'inherit',
                            }}
                            placeholder="z. B. 'Daten müssen aus steuerlichen Gründen vorerst behalten werden.'"
                            maxLength={MAX_ADMIN_NOTE}
                          />
                          <div
                            style={{
                              marginTop: 4,
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: 11,
                              color: '#6b7280',
                            }}
                          >
                            <span>{charsLeft} Zeichen übrig</span>

                            {isOpen ? (
                              <button
                                type="button"
                                onClick={() => rejectRequest(r.id)}
                                disabled={savingId === r.id}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: 999,
                                  border: '1px solid #fecaca',
                                  background: '#fef2f2',
                                  color: '#b91c1c',
                                  cursor:
                                    savingId === r.id ? 'not-allowed' : 'pointer',
                                }}
                              >
                                {savingId === r.id
                                  ? 'Lehne ab…'
                                  : 'Als abgelehnt markieren'}
                              </button>
                            ) : (
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  background: '#f9fafb',
                                  fontSize: 11,
                                }}
                              >
                                Bereits {r.status === 'rejected'
                                  ? 'abgelehnt'
                                  : 'abgeschlossen'}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: 8, verticalAlign: 'top' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 999,
                              fontSize: 12,
                              background:
                                r.status === 'open'
                                  ? '#eff6ff'
                                  : r.status === 'done'
                                  ? '#ecfdf5'
                                  : '#fef2f2',
                              color:
                                r.status === 'open'
                                  ? '#1d4ed8'
                                  : r.status === 'done'
                                  ? '#15803d'
                                  : '#b91c1c',
                            }}
                          >
                            {r.status === 'open' && 'Offen'}
                            {r.status === 'done' && 'Abgeschlossen'}
                            {r.status === 'rejected' && 'Abgelehnt'}
                          </span>
                        </td>

                        {/* Datum */}
                        <td style={{ padding: 8, verticalAlign: 'top', fontSize: 12 }}>
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
