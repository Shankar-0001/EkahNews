import { NextResponse } from 'next/server'

const BASE_URL = 'https://www.ekahnews.com'

export async function GET() {
  const lastmod = new Date().toISOString()
  const sitemaps = [
    `${BASE_URL}/sitemap.xml`,
    `${BASE_URL}/news-sitemap.xml`,
    `${BASE_URL}/article-sitemap.xml`,
    `${BASE_URL}/category-sitemap.xml`,
    `${BASE_URL}/web-stories-sitemap.xml`,
    `${BASE_URL}/topic-sitemap.xml`,
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map((url) => `  <sitemap>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  })
}
