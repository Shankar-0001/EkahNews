import { slugFromText } from '@/lib/site-config'

const DEFAULT_TREND_GEOS = ['US', 'IN', 'GB', 'CA', 'AU']

function decodeXmlEntities(text = '') {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function getTagValue(item = '', tagName = '') {
  const cdataPattern = new RegExp(`<${tagName}><!\\[CDATA\\[(.*?)\\]\\]><\\/${tagName}>`, 'i')
  const plainPattern = new RegExp(`<${tagName}>(.*?)<\\/${tagName}>`, 'i')
  const match = item.match(cdataPattern) || item.match(plainPattern)
  return match?.[1] ? decodeXmlEntities(match[1].trim()) : ''
}

function parseTraffic(raw = '') {
  const value = (raw || '').toString().trim().toUpperCase().replace(/[+,]/g, '')
  if (!value) return 0
  const multiplier = value.endsWith('M') ? 1000000 : value.endsWith('K') ? 1000 : 1
  const numeric = Number.parseFloat(value.replace(/[MK]$/, ''))
  if (!Number.isFinite(numeric)) return 0
  return Math.round(numeric * multiplier)
}

function extractTrendItemsFromRss(xml = '', geo = 'US') {
  const items = []
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || []

  for (const item of itemMatches) {
    const keyword = getTagValue(item, 'title').toLowerCase()
    if (!keyword) continue
    const slug = slugFromText(keyword)
    if (!slug) continue
    const startedAt = getTagValue(item, 'pubDate')
    const trafficRaw = getTagValue(item, 'ht:approx_traffic')

    items.push({
      keyword,
      slug,
      geo,
      started_at: startedAt ? new Date(startedAt).toISOString() : null,
      traffic_raw: trafficRaw,
      search_volume: parseTraffic(trafficRaw),
    })
  }

  return items
}

function getConfiguredGeos() {
  const raw = process.env.TRENDS_GEO_LIST
  if (!raw) return DEFAULT_TREND_GEOS
  const list = raw
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
  return list.length > 0 ? list : DEFAULT_TREND_GEOS
}

async function fetchGoogleTrendsForGeo(geo = 'US') {
  const response = await fetch(`https://trends.google.com/trending/rss?geo=${encodeURIComponent(geo)}`, {
    next: { revalidate: 1800 },
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; EkahNewsTrendsBot/1.0)',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch trends RSS: ${response.status}`)
  }

  const xml = await response.text()
  return extractTrendItemsFromRss(xml, geo)
}

export function normalizeTrendingKeywords(keywords = []) {
  const map = new Map()

  for (const raw of keywords) {
    const keyword = (raw || '').toString().trim().toLowerCase()
    if (!keyword) continue
    const slug = slugFromText(keyword)
    if (!slug) continue
    if (!map.has(slug)) map.set(slug, { keyword, slug })
  }

  return [...map.values()]
}

export async function fetchGoogleTrendingNow({ limit = 120 } = {}) {
  const geos = getConfiguredGeos()
  const merged = new Map()

  await Promise.all(
    geos.map(async (geo) => {
      try {
        const rows = await fetchGoogleTrendsForGeo(geo)
        rows.forEach((row, index) => {
          const prev = merged.get(row.slug) || {
            keyword: row.keyword,
            slug: row.slug,
            search_volume: 0,
            created_at: row.started_at || new Date().toISOString(),
            geos: [],
            rank_score: 0,
          }
          merged.set(row.slug, {
            ...prev,
            search_volume: Math.max(prev.search_volume || 0, row.search_volume || 0),
            created_at: prev.created_at || row.started_at || new Date().toISOString(),
            geos: [...new Set([...(prev.geos || []), geo])],
            rank_score: (prev.rank_score || 0) + (rows.length - index),
          })
        })
      } catch {
        // Skip one region if it fails.
      }
    })
  )

  return [...merged.values()]
    .sort((a, b) => {
      if ((b.search_volume || 0) !== (a.search_volume || 0)) {
        return (b.search_volume || 0) - (a.search_volume || 0)
      }
      return (b.rank_score || 0) - (a.rank_score || 0)
    })
    .slice(0, limit)
}

export async function fetchTrendingQueries() {
  try {
    return await fetchGoogleTrendingNow({ limit: 200 })
  } catch {
    return []
  }
}


