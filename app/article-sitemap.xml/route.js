import { createOptionalPublicClient } from '@/lib/supabase/public-server'
import { getArticleCanonicalUrl } from '@/lib/site-config'
import { urlsetXml, xmlResponse } from '@/lib/sitemap-utils'
import { isBlockedCategorySlug } from '@/lib/category-utils'
import { runListQuery } from '@/lib/supabase/query-timeout'

const MAX_URLS = 50000

export async function GET() {
  const supabase = createOptionalPublicClient()
  if (!supabase) {
    return xmlResponse(urlsetXml([]))
  }

  const { data: rows } = await runListQuery(
    (signal) => supabase
      .from('articles')
      .select('slug, canonical_url, updated_at, published_at, categories(slug)')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(MAX_URLS)
      .abortSignal(signal),
    { label: 'articleSitemap:articles' }
  )

  const entries = (rows || [])
    .filter((article) => article?.slug && !isBlockedCategorySlug(article.categories?.slug))
    .map((article) => ({
      loc: getArticleCanonicalUrl(article),
      lastmod: new Date(article.updated_at || article.published_at || Date.now()).toISOString(),
      changefreq: 'daily',
      priority: 0.8,
    }))

  return xmlResponse(urlsetXml(entries))
}
