// src/app/auftragsboerse/page.tsx
import React, { Suspense } from 'react'
import AuftragsboerseSeite from './AuftragsboerseSeite'
import { fetchBoersenJobs } from '@/lib/jobs-boerse'


export const dynamic = 'force-dynamic'
export const revalidate = 0

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
        </div>
      }
    >
      <AuftragsboerseSeite jobs={jobs} />
    </Suspense>
  )
}
