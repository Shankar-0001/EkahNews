import { runListQuery } from '@/lib/supabase/query-timeout'

const DEFAULT_PAGE_SIZE = 12
const MAX_PAGE_SIZE = 24

function normalizePage(page) {
  const parsed = Number.parseInt(String(page || '1'), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function normalizePageSize(pageSize) {
  const parsed = Number.parseInt(String(pageSize || DEFAULT_PAGE_SIZE), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_PAGE_SIZE
  }
  return Math.min(MAX_PAGE_SIZE, parsed)
}

function normalizeArticleItem(article) {
  return {
    ...article,
    _type: 'article',
  }
}

function normalizeWebStoryItem(story) {
  return {
    ...story,
    _type: 'web_story',
  }
}

function sortByPublishedAt(items = []) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left?.published_at || 0).getTime()
    const rightTime = new Date(right?.published_at || 0).getTime()
    return rightTime - leftTime
  })
}

export async function getLatestFeedPage(supabase, { page = 1, pageSize = DEFAULT_PAGE_SIZE } = {}) {
  if (!supabase) {
    return {
      items: [],
      total: 0,
      hasMore: false,
      page: normalizePage(page),
      pageSize: normalizePageSize(pageSize),
      unavailable: false,
    }
  }

  const normalizedPage = normalizePage(page)
  const normalizedPageSize = normalizePageSize(pageSize)
  const windowSize = normalizedPage * normalizedPageSize
  const rangeEnd = Math.max(0, windowSize - 1)

  const [articlesResult, storiesResult] = await Promise.all([
    runListQuery(
      (signal) => supabase
        .from('articles')
        .select(`
          id,
          title,
          slug,
          excerpt,
          featured_image_url,
          featured_image_alt,
          published_at,
          authors (name),
          categories (name, slug)
        `, { count: 'exact' })
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .range(0, rangeEnd)
        .abortSignal(signal),
      { label: `latestFeed:articles:page:${normalizedPage}` }
    ),
    runListQuery(
      (signal) => supabase
        .from('web_stories')
        .select(`
          id,
          title,
          slug,
          cover_image,
          cover_image_alt,
          published_at,
          authors (name),
          categories (name, slug)
        `, { count: 'exact' })
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .range(0, rangeEnd)
        .abortSignal(signal),
      { label: `latestFeed:webStories:page:${normalizedPage}` }
    ),
  ])

  const merged = sortByPublishedAt([
    ...(articlesResult.data || []).map(normalizeArticleItem),
    ...(storiesResult.data || []).map(normalizeWebStoryItem),
  ])

  const startIndex = (normalizedPage - 1) * normalizedPageSize
  const endIndex = startIndex + normalizedPageSize
  const total = (articlesResult.count || 0) + (storiesResult.count || 0)
  const items = merged.slice(startIndex, endIndex)

  return {
    items,
    total,
    hasMore: endIndex < total,
    page: normalizedPage,
    pageSize: normalizedPageSize,
    unavailable: Boolean(articlesResult.unavailable || storiesResult.unavailable),
  }
}
