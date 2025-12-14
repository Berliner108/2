// src/app/auftragsboerse/auftraege/[id]/page.tsx
import 'server-only'
import { notFound } from 'next/navigation'
import AuftragDetailClient from './AuftragDetailClient'
import { fetchJobDetail } from '@/lib/job-detail'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = {
  // ✅ Next (neuere Versionen): params kann als Promise typisiert sein
  params: Promise<{ id: string }>
}

export default async function Page({ params }: Props) {
  const { id } = await params

  const auftrag = await fetchJobDetail(id)
  if (!auftrag) notFound()

  return <AuftragDetailClient auftrag={auftrag} />
}
