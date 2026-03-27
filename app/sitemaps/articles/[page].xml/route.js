import { createClient } from '@/lib/supabase/server'
import { getArticleCanonicalUrl } from '@/lib/site-config'
import { urlsetXml, xmlResponse } from '@/lib/sitemap-utils'

const PAGE_SIZE = 5000

function toPageNumber(raw) {
  const page = Number.parseInt(raw, 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

export async function GET(_request, context) {
  const supabase = await createClient()
  const page = toPageNumber(context?.params?.page)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: rows } = await supabase
    .from('articles')
    .select('slug, canonical_url, updated_at, published_at, categories(slug)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(from, to)

  const entries = (rows || []).map((article) => ({
    loc: absoluteUrl(`/${article.categories?.slug || 'news'}/${article.slug}`),
    lastmod: new Date(article.updated_at || article.published_at || Date.now()).toISOString(),
    changefreq: 'daily',
    priority: 0.8,
  }))

  return xmlResponse(urlsetXml(entries))
}

