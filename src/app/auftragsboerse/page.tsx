// src/app/auftragsboerse/page.tsx
import React from 'react'
import { Loader2 } from 'lucide-react'
import AuftragsboerseSeite from './AuftragsboerseSeite'
import { fetchBoersenJobs } from '@/lib/jobs-boerse'
import type { Auftrag } from '@/lib/types/auftrag'

export const dynamic = 'force-dynamic' // damit immer frische Jobs geladen werden

export default async function Page() {
  // Jobs aus Supabase holen
  const jobs: Auftrag[] = await fetchBoersenJobs()

  // Dein Suspense-Fallback brauchst du hier eigentlich nicht mehr,
  // weil wir die Daten schon auf dem Server laden – aber ich lasse ihn
  // inhaltlich ähnlich, damit du nichts im Layout verlierst.
  if (!jobs || jobs.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <Loader2 className="animate-spin" size={32} />
      </div>
    )
  }

  return <AuftragsboerseSeite jobs={jobs} />
}
