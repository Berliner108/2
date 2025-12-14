// src/app/auftragsboerse/page.tsx
import React, { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import AuftragsboerseSeite from './AuftragsboerseSeite'
import { fetchBoersenJobs } from '@/lib/jobs-boerse'

export default async function Page() {
  const jobs = await fetchBoersenJobs()

  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <Loader2 className="animate-spin" size={32} />
        </div>
      }
    >
      <AuftragsboerseSeite jobs={jobs} />
    </Suspense>
  )
}
