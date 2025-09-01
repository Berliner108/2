// /src/app/admin/lackanfragen/Actions.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export default function Actions({ id, initialPublished }: { id: string; initialPublished: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState<'soft' | 'hard' | null>(null)

  async function callDelete(hard: boolean) {
    try {
      setLoading(hard ? 'hard' : 'soft')
      const res = await fetch(`/api/admin/lackanfragen/${id}${hard ? '?hard=1' : ''}`, {
        method: 'DELETE',
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j?.error || 'Fehlgeschlagen')
    } catch (e: any) {
      alert(e?.message || 'Fehler beim Löschen')
    } finally {
      setLoading(null)
      startTransition(() => router.refresh())
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button
        disabled={isPending || loading === 'soft'}
        onClick={() => callDelete(false)}
        title="Soft-Delete: published=false (verschwindet aus der Börse)"
        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}
      >
        {loading === 'soft' ? '…' : (initialPublished ? 'Aus Börse entfernen' : 'Schon offline')}
      </button>
      <button
        disabled={isPending || loading === 'hard'}
        onClick={() => {
          if (confirm('Wirklich endgültig löschen? DB-Zeile und Dateien werden entfernt.')) {
            callDelete(true)
          }
        }}
        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ef4444', background: '#fee2e2', color: '#991b1b' }}
      >
        {loading === 'hard' ? '…' : 'Hard löschen'}
      </button>
    </div>
  )
}
