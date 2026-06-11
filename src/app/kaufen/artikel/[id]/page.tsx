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

async function fetchArticleForSeo(id: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'https://www.beschichterscout.com'

  try {
    const res = await fetch(`${baseUrl}/api/articles/${encodeURIComponent(id)}`, {
      cache: 'no-store',
    })

    if (!res.ok) return null

    const json = await res.json()
    return json?.article ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const article = await fetchArticleForSeo(id)

  if (!article) {
    return {
      title: 'Artikel nicht gefunden',
      description: 'Dieser Shop-Artikel wurde nicht gefunden oder ist nicht mehr verfügbar.',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const titleText = cleanText(article.title, 'Shop-Artikel')
  const category = cleanText(article.category)
  const manufacturer = cleanText(article.manufacturer)
  const colorCode = cleanText(article.color_code)
  const colorTone = cleanText(article.color_tone)
  const price =
    typeof article.price_from === 'number'
      ? `${Number(article.price_from).toFixed(2)} €`
      : ''

  const title = `${titleText} kaufen`

  const description = truncate(
  [
    `${titleText} im Beschichter-Shop auf BeschichterScout.`,
    category ? `Kategorie: ${category}.` : '',
    manufacturer ? `Hersteller: ${manufacturer}.` : '',
    colorCode || colorTone ? `Farbe: ${[colorCode, colorTone].filter(Boolean).join(' ')}.` : '',
    'Jetzt Details ansehen.',
  ]
    .filter(Boolean)
    .join(' ')
)

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.beschichterscout.com/kaufen/artikel/${id}`,
    },
    openGraph: {
      title: `${title} | BeschichterScout`,
      description,
      url: `https://www.beschichterscout.com/kaufen/artikel/${id}`,
      siteName: 'BeschichterScout',
      locale: 'de_AT',
      type: 'article',
    },
  }
}

export default function Page() {
  return <ArtikelDetailClient />
}