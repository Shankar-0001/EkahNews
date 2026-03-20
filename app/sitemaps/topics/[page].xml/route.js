import { createClient } from '@/lib/supabase/server'
import { absoluteUrl } from '@/lib/site-config'
import { urlsetXml, xmlResponse } from '@/lib/sitemap-utils'

const PAGE_SIZE = 1200
const MIN_MATCH_COUNT = 3

function toPageNumber(raw) {
  const page = Number.parseInt(raw, 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

function buildTopicEntries(slug, lastmod, priority = 0.6) {
  return [
    {
      loc: absoluteUrl(`/topic/${slug}`),
      lastmod,
      changefreq: 'weekly',
      priority,
    },
    {
      loc: absoluteUrl(`/trending/${slug}`),
      lastmod,
      changefreq: 'daily',
      priority: Math.max(priority, 0.7),
    },
    {
      loc: absoluteUrl(`/explained/${slug}`),
      lastmod,
      changefreq: 'weekly',
      priority,
    },
  ]
}

function keywordPattern(slug = '') {
  const cleaned = String(slug)
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9\s-]/gi, ' ')
    .trim()

  if (!cleaned) return null
  return `%${cleaned}%`
}

export async function GET(_request, context) {
  const page = toPageNumber(context?.params?.page)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const supabase = await createClient()

  const { data: trendRows } = await supabase
    .from('trending_topics')
    .select('slug, updated_at')
    .order('updated_at', { ascending: false })
    .range(from, to)

  const eligibleRows = await Promise.all((trendRows || []).map(async (row) => {
    if (!row?.slug) return null

    const pattern = keywordPattern(row.slug)
    if (!pattern) return null

    const { count, error } = await supabase
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .or(`title.ilike.${pattern},excerpt.ilike.${pattern},content.ilike.${pattern}`)

    if (error || (count || 0) < MIN_MATCH_COUNT) {
      return null
    }

    return row
  }))

  const trendEntries = eligibleRows
    .filter(Boolean)
    .flatMap((row) =>
      buildTopicEntries(
        row.slug,
        new Date(row.updated_at || Date.now()).toISOString(),
        0.7
      )
    )

  const dedup = new Map()
  for (const entry of trendEntries) {
    if (!dedup.has(entry.loc)) {
      dedup.set(entry.loc, entry)
    }
  }

  return xmlResponse(urlsetXml([...dedup.values()]))
}