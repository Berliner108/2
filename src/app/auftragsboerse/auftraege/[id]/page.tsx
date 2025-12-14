// src/app/auftragsboerse/auftraege/[id]/page.tsx
import 'server-only'
import { notFound } from 'next/navigation'
import AuftragDetailClient from './AuftragDetailClient'
import { fetchJobDetail } from '@/lib/job-detail'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = {
  params: { id: string }
}

export default async function Page({ params }: Props) {
  const auftrag = await fetchJobDetail(params.id)

  if (!auftrag) notFound()

  return <AuftragDetailClient auftrag={auftrag} />
}
