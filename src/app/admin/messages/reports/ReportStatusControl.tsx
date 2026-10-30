'use client'

import {
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

type ReportStatus =
  | 'open'
  | 'reviewing'
  | 'resolved'
  | 'rejected'

export default function ReportStatusControl({
  reportId,
  initialStatus,
}: {
  reportId: string
  initialStatus: string
}) {
  const router =
    useRouter()

  const [
    status,
    setStatus,
  ] =
    useState<ReportStatus>(
      (
        initialStatus ||
        'open'
      ) as ReportStatus
    )

  const [
    saving,
    setSaving,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    )

  async function save() {
    if (saving) {
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res =
        await fetch(
          '/api/admin/messages/reports/status',
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            credentials:
              'include',

            body:
              JSON.stringify({
                reportId,
                status,
              }),
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
        throw new Error(
          'Status konnte nicht gespeichert werden.'
        )
      }

      router.refresh()
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Status konnte nicht gespeichert werden.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection:
          'column',
        gap: 6,
        minWidth: 145,
      }}
    >
      <select
        value={
          status
        }
        onChange={(
          event
        ) =>
          setStatus(
            event.target
              .value as ReportStatus
          )
        }
        disabled={
          saving
        }
        style={{
          padding:
            '7px 8px',
          border:
            '1px solid #d1d5db',
          borderRadius: 8,
          background:
            '#fff',
        }}
      >
        <option value="open">
          Offen
        </option>

        <option value="reviewing">
          In Prüfung
        </option>

        <option value="resolved">
          Erledigt
        </option>

        <option value="rejected">
          Abgewiesen
        </option>
      </select>

      <button
        type="button"
        onClick={() =>
          void save()
        }
        disabled={
          saving ||
          status ===
            initialStatus
        }
        style={{
          border: 0,
          borderRadius: 8,
          padding:
            '7px 10px',
          background:
            '#111827',
          color: '#fff',
          cursor:
            saving
              ? 'default'
              : 'pointer',
          opacity:
            saving ||
            status ===
              initialStatus
              ? 0.5
              : 1,
        }}
      >
        {saving
          ? 'Speichern …'
          : 'Speichern'}
      </button>

      {error && (
        <span
          style={{
            color:
              '#b91c1c',
            fontSize:
              '0.75rem',
          }}
        >
          {error}
        </span>
      )}
    </div>
  )
}