import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://ekahnews.com'
const NEWS_WINDOW_MS = 48 * 60 * 60 * 1000
const MAX_URLS = 1000

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildCanonicalArticleUrl(article) {
  const categorySlug = article.categories?.slug || 'news'
  return `${SITE_URL}/${categorySlug}/${article.slug}`
}

export async function GET() {
  const supabase = await createClient()
  const cutoffIso = new Date(Date.now() - NEWS_WINDOW_MS).toISOString()

  const { data: articles, error } = await supabase
    .from('articles')
    .select('slug, title, published_at, categories(slug)')
    .eq('status', 'published')
    .gte('published_at', cutoffIso)
    .order('published_at', { ascending: false })
    .limit(MAX_URLS)

  if (error) {
    return new NextResponse('Failed to generate news sitemap', { status: 500 })
  }

  const seenUrls = new Set()
  const urls = (articles || [])
    .filter((article) => article?.slug && article?.published_at)
    .map((article) => {
      const articleUrl = buildCanonicalArticleUrl(article)
      if (seenUrls.has(articleUrl)) {
        return ''
      }
      seenUrls.add(articleUrl)

      const publicationDate = new Date(article.published_at).toISOString()
      const title = escapeXml(article.title || 'Untitled')

      return `
  <url>
    <loc>${escapeXml(articleUrl)}</loc>
    <news:news>
      <news:publication>
        <news:name>EkahNews</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${publicationDate}</news:publication_date>
      <news:title>${title}</news:title>
    </news:news>
  </url>`
    })
    .filter(Boolean)
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
>${urls}
</urlset>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
