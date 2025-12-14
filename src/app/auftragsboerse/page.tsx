// src/app/auftragsboerse/page.tsx
import AuftragsboerseSeite from './AuftragsboerseSeite'
import { fetchBoersenJobs } from '@/lib/jobs-boerse'

export default async function Page() {
  const jobs = await fetchBoersenJobs()

  return <AuftragsboerseSeite jobs={jobs} />
}
