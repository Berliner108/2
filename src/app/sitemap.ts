import type { MetadataRoute } from 'next'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const baseUrl = 'https://www.beschichterscout.com'

type SitemapEntry = MetadataRoute.Sitemap[number]

function staticPages(): SitemapEntry[] {
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/auftragsboerse`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/angebote`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/lackanfragen`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/kaufen`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/wissenswertes`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ]
}

async function getAuftragsUrls(): Promise<SitemapEntry[]> {
  try {
    const admin = supabaseAdmin()

    const { data, error } = await admin
      .from('jobs')
      .select('id, updated_at')
      .eq('published', true)
      .eq('status', 'open')
      .order('updated_at', { ascending: false })
      .limit(1000)

    if (error || !data) return []

    return data.map((job) => ({
      url: `${baseUrl}/auftragsboerse/auftraege/${job.id}`,
      lastModified: job.updated_at ? new Date(job.updated_at) : new Date(),
      changeFrequency: 'daily',
      priority: 0.75,
    }))
  } catch {
    return []
  }
}

async function getShopArtikelUrls(): Promise<SitemapEntry[]> {
  try {
    const admin = supabaseAdmin()

    const { data, error } = await admin
      .from('articles')
      .select('id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1000)

    if (error || !data) return []

    return data.map((article) => ({
      url: `${baseUrl}/kaufen/artikel/${article.id}`,
      lastModified: article.updated_at ? new Date(article.updated_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }))
  } catch {
    return []
  }
}

async function getLackanfragenUrls(): Promise<SitemapEntry[]> {
  try {
    const admin = supabaseAdmin()

    const { data, error } = await admin
      .from('lack_requests')
      .select('id, updated_at')
      .eq('published', true)
      .eq('status', 'open')
      .order('updated_at', { ascending: false })
      .limit(1000)

    if (error || !data) return []

    return data.map((request) => ({
      url: `${baseUrl}/lackanfragen/artikel/${request.id}`,
      lastModified: request.updated_at ? new Date(request.updated_at) : new Date(),
      changeFrequency: 'daily',
      priority: 0.75,
    }))
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [auftragsUrls, shopArtikelUrls, lackanfragenUrls] = await Promise.all([
    getAuftragsUrls(),
    getShopArtikelUrls(),
    getLackanfragenUrls(),
  ])

  return [
    ...staticPages(),
    ...auftragsUrls,
    ...shopArtikelUrls,
    ...lackanfragenUrls,
  ]
}