// src/app/auftragsboerse/auftraege/[id]/page.tsx
import 'server-only'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import AuftragDetailClient from './AuftragDetailClient'
import { fetchJobDetail } from '@/lib/job-detail'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Props = {
  params: Promise<{ id: string }>
}

function cleanText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function truncate(value: string, max = 155) {
  if (value.length <= max) return value
  return value.slice(0, max - 1).trimEnd() + '…'
}

function getVerfahrenText(auftrag: any) {
  const verfahren = auftrag?.verfahren

  if (Array.isArray(verfahren) && verfahren.length > 0) {
    return verfahren
      .map((v: any) => cleanText(v?.name))
      .filter(Boolean)
      .join(' & ')
  }

  return 'Beschichtungsauftrag'
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const auftrag = await fetchJobDetail(id)

  if (!auftrag) {
    return {
      title: 'Auftrag nicht gefunden',
      description: 'Dieser Beschichtungsauftrag wurde nicht gefunden oder ist nicht mehr verfügbar.',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const verfahrenText = getVerfahrenText(auftrag)
  const material = cleanText(auftrag?.material, 'Material nicht angegeben')
  const standort = cleanText(auftrag?.standort, '')
  const masse = auftrag?.masse ? `${auftrag.masse} kg` : ''

  const title = `${verfahrenText} für ${material} gesucht`
  const description = truncate(
    [
      `${verfahrenText} Auftrag auf BeschichterScout.`,
      material ? `Material: ${material}.` : '',
      masse ? `Masse: ${masse}.` : '',
      standort ? `Standort: ${standort}.` : '',
      'Jetzt als Beschichter ein Angebot abgeben.',
    ]
      .filter(Boolean)
      .join(' ')
  )

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.beschichterscout.com/auftragsboerse/auftraege/${id}`,
    },
    openGraph: {
      title: `${title} | BeschichterScout`,
      description,
      url: `https://www.beschichterscout.com/auftragsboerse/auftraege/${id}`,
      siteName: 'BeschichterScout',
      locale: 'de_AT',
      type: 'article',
    },
  }
}

export default async function Page({ params }: Props) {
  const { id } = await params

  const auftrag = await fetchJobDetail(id)
  if (!auftrag) notFound()

  return <AuftragDetailClient key={auftrag.id} auftrag={auftrag} />
}