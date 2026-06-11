import type { Metadata } from 'next'
import ArtikelDetailClient from './ArtikelDetailClient'

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

function normalizeArticle(raw: any) {
  const item = raw?.artikel ?? raw?.request ?? raw?.item ?? raw?.items?.[0] ?? raw
  const data = item?.data ?? item ?? {}

  return {
    category: cleanText(
      item?.category ??
        item?.kategorie ??
        data?.category ??
        data?.kategorie
    ),

    manufacturer: cleanText(
      item?.manufacturer ??
        item?.hersteller ??
        data?.manufacturer ??
        data?.hersteller
    ),

    colorCode: cleanText(
      item?.color_code ??
        item?.farbcode ??
        data?.color_code ??
        data?.farbcode
    ),

    colorPalette: cleanText(
      item?.color_palette ??
        item?.farbpalette ??
        data?.color_palette ??
        data?.farbpalette
    ),

    colorTone: cleanText(
      item?.color_tone ??
        item?.farbton ??
        data?.color_tone ??
        data?.farbton
    ),

    quality: cleanText(
      item?.quality ??
        item?.qualität ??
        data?.quality ??
        data?.qualität
    ),

    effect: cleanText(
      item?.effect ??
        item?.effekt ??
        data?.effect ??
        data?.effekt
    ),
  }
}

async function fetchLackanfrageForSeo(id: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'https://www.beschichterscout.com'

  try {
    const res = await fetch(
      `${baseUrl}/api/lackanfragen?id=${encodeURIComponent(id)}&includeUnpublished=1`,
      {
        cache: 'no-store',
      }
    )

    if (!res.ok) return null

    const json = await res.json()
    return normalizeArticle(json)
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const artikel = await fetchLackanfrageForSeo(id)

  if (!artikel) {
    return {
      title: 'Lackanfrage nicht gefunden',
      description: 'Diese Lackanfrage wurde nicht gefunden oder ist nicht mehr verfügbar.',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const category = artikel.category
  const manufacturer = artikel.manufacturer
  const colorCode = artikel.colorCode
  const colorPalette = artikel.colorPalette
  const colorTone = artikel.colorTone
  const quality = artikel.quality
  const effect = artikel.effect

  const title = [
    category ? `${category} gesucht` : 'Lackanfrage gesucht',
    colorCode ? colorCode : '',
    colorPalette ? colorPalette : '',
  ]
    .filter(Boolean)
    .join(' ')

  const description = truncate(
    [
      'Lackanfrage auf BeschichterScout.',
      category ? `Kategorie: ${category}.` : '',
      manufacturer ? `Hersteller: ${manufacturer}.` : '',
      colorCode ? `Farbcode: ${colorCode}.` : '',
      colorPalette ? `Farbpalette: ${colorPalette}.` : '',
      colorTone ? `Farbton: ${colorTone}.` : '',
      quality ? `Qualität: ${quality}.` : '',
      effect ? `Effekt: ${effect}.` : '',
      'Details ansehen.',
    ]
      .filter(Boolean)
      .join(' ')
  )

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.beschichterscout.com/lackanfragen/artikel/${id}`,
    },
    openGraph: {
      title: `${title} | BeschichterScout`,
      description,
      url: `https://www.beschichterscout.com/lackanfragen/artikel/${id}`,
      siteName: 'BeschichterScout',
      locale: 'de_AT',
      type: 'article',
    },
  }
}

export default function Page() {
  return <ArtikelDetailClient />
}