// src/app/auftragsboerse/auftraege/[id]/page.tsx
import { notFound } from 'next/navigation'
import Navbar from '@/app/components/navbar/Navbar'
import styles from './detailseite.module.css'
import AuftragDetailClient from './AuftragDetailClient'
import { fetchJobDetail } from '@/lib/job-detail'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Page({ params }: { params: { id: string } }) {
  const auftrag = await fetchJobDetail(params.id)
  if (!auftrag) notFound()

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <AuftragDetailClient auftrag={auftrag} />
      </div>
    </>
  )
}
