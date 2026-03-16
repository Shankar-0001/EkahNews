import { createClient } from '@/lib/supabase/server'
import { absoluteUrl } from '@/lib/site-config'
import { xmlResponse } from '@/lib/sitemap-utils'

const PAGE_SIZE = 1000
const NEWS_WINDOW_MS = 2 * 24 * 60 * 60 * 1000
const PUBLICATION_NAME = 'EkahNews'
const PUBLICATION_LANGUAGE = 'en'

function toPageNumber(raw) {
  const page = Number.parseInt(raw, 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildNewsSitemapXml(entries = []) {
  const body = entries
    .map((entry) => `
  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${escapeXml(PUBLICATION_NAME)}</news:name>
        <news:language>${PUBLICATION_LANGUAGE}</news:language>
      </news:publication>
      <news:publication_date>${new Date(entry.publishedAt).toISOString()}</news:publication_date>
      <news:title>${escapeXml(entry.title)}</news:title>
      ${entry.keywords ? `<news:keywords>${escapeXml(entry.keywords)}</news:keywords>` : ''}
    </news:news>
  </url>`)
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${body}
</urlset>`
}

export async function GET(_request, context) {
  const supabase = await createClient()
  const page = toPageNumber(context?.params?.page)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const cutoffIso = new Date(Date.now() - NEWS_WINDOW_MS).toISOString()

  const { data: rows } = await supabase
    .from('articles')
    .select('slug, title, published_at, categories(slug)')
    .eq('status', 'published')
    .gte('published_at', cutoffIso)
    .order('published_at', { ascending: false })
    .range(from, to)

  const entries = (rows || []).map((article) => ({
    loc: absoluteUrl(`/${article.categories?.slug || 'news'}/${article.slug}`),
    title: article.title || 'News update',
    keywords: '',
    publishedAt: article.published_at,
  }))

  return xmlResponse(buildNewsSitemapXml(entries))
}

