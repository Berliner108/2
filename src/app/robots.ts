import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/login',
        '/konto',
        '/admin',
        '/api',
      ],
    },
    sitemap: 'https://www.beschichterscout.com/sitemap.xml',
  }
}