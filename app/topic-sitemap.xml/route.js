import { createOptionalPublicClient } from '@/lib/supabase/public-server'
import { absoluteUrl } from '@/lib/site-config'
import { urlsetXml, xmlResponse } from '@/lib/sitemap-utils'

const MAX_URLS = 50000
const MIN_MATCH_COUNT = 3
const MAX_NGRAM_WORDS = 6
const ARTICLE_LOOKBACK_DAYS = 365

function normalizeTopicSlug(slug = '') {
  return String(slug)
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9\s-]/gi, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value = '') {
  return normalizeTopicSlug(value)
    .split(' ')
    .filter(Boolean)
}

function buildPhraseCountMap(articles = []) {
  const counts = new Map()

  for (const article of articles) {
    const tokens = tokenize(`${article.title || ''} ${article.excerpt || ''}`)
    if (tokens.length === 0) continue

    const seenPhrases = new Set()
    for (let start = 0; start < tokens.length; start += 1) {
      for (let size = 1; size <= MAX_NGRAM_WORDS && start + size <= tokens.length; size += 1) {
        seenPhrases.add(tokens.slice(start, start + size).join(' '))
      }
    }

    for (const phrase of seenPhrases) {
      counts.set(phrase, (counts.get(phrase) || 0) + 1)
    }
  }

  return counts
}

export async function GET() {
  const supabase = createOptionalPublicClient()
  if (!supabase) {
    return xmlResponse(urlsetXml([]))
  }

  const publishedAfterIso = new Date(Date.now() - ARTICLE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: trendRows }, { data: articleRows }] = await Promise.all([
    supabase
      .from('trending_topics')
      .select('slug, updated_at')
      .order('updated_at', { ascending: false })
      .limit(MAX_URLS),
    supabase
      .from('articles')
      .select('title, excerpt')
      .eq('status', 'published')
      .gte('published_at', publishedAfterIso),
  ])

  const phraseCountMap = buildPhraseCountMap(articleRows || [])

  const entries = (trendRows || [])
    .filter((row) => {
      if (!row?.slug) return false
      const normalizedSlug = normalizeTopicSlug(row.slug)
      if (!normalizedSlug) return false
      return (phraseCountMap.get(normalizedSlug) || 0) >= MIN_MATCH_COUNT
    })
    .map((row) => ({
      loc: absoluteUrl(`/topic/${row.slug}`),
      lastmod: new Date(row.updated_at || Date.now()).toISOString(),
      changefreq: 'weekly',
      priority: 0.7,
    }))

  return xmlResponse(urlsetXml(entries))
}

