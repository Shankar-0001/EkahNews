import { createOptionalPublicClient } from '@/lib/supabase/public-server'
import { getArticleCanonicalUrl, SITE_URL } from '@/lib/site-config'
import { filterBlockedCategories, isBlockedCategorySlug } from '@/lib/category-utils'

export const revalidate = 3600

export default async function sitemap() {
  const supabase = createOptionalPublicClient()

  if (!supabase) {
    return [
      {
        url: SITE_URL,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1.0,
      },
    ]
  }

  const [
    { data: categories },
    { data: articles },
    { data: authors },
    { data: articleTagLinks },
    { data: webStoryTagLinks },
    { data: stories },
  ] = await Promise.all([
    supabase
      .from('categories')
      .select('slug, updated_at'),
    supabase
      .from('articles')
      .select('slug, canonical_url, updated_at, published_at, categories(slug), authors(slug)')
      .eq('status', 'published')
      .order('published_at', { ascending: false }),
    supabase
      .from('authors')
      .select('id, slug, updated_at'),
    supabase
      .from('article_tags')
      .select('tag_id, articles!inner(status, published_at)')
      .eq('articles.status', 'published'),
    supabase
      .from('web_story_tags')
      .select('tag_id, web_stories!inner(status, published_at)')
      .eq('web_stories.status', 'published'),
    supabase
      .from('web_stories')
      .select('slug, updated_at, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false }),
  ])

  const tagIds = [...new Set([...(articleTagLinks || []), ...(webStoryTagLinks || [])].map((row) => row.tag_id).filter(Boolean))]
  const tagStats = new Map()
  for (const row of articleTagLinks || []) {
    if (!row?.tag_id) continue
    const current = tagStats.get(row.tag_id) || { count: 0, latestPublishedAt: null }
    const publishedAt = row.articles?.published_at || null
    const latestPublishedAt = current.latestPublishedAt && publishedAt
      ? (new Date(current.latestPublishedAt) > new Date(publishedAt) ? current.latestPublishedAt : publishedAt)
      : (current.latestPublishedAt || publishedAt)

    tagStats.set(row.tag_id, {
      count: current.count + 1,
      latestPublishedAt,
    })
  }
  for (const row of webStoryTagLinks || []) {
    if (!row?.tag_id) continue
    const current = tagStats.get(row.tag_id) || { count: 0, latestPublishedAt: null }
    const publishedAt = row.web_stories?.published_at || null
    const latestPublishedAt = current.latestPublishedAt && publishedAt
      ? (new Date(current.latestPublishedAt) > new Date(publishedAt) ? current.latestPublishedAt : publishedAt)
      : (current.latestPublishedAt || publishedAt)

    tagStats.set(row.tag_id, {
      count: current.count + 1,
      latestPublishedAt,
    })
  }

  const { data: tags } = tagIds.length
    ? await supabase
      .from('tags')
      .select('id, slug, updated_at')
      .in('id', tagIds)
    : { data: [] }

  const categoryHubEntries = filterBlockedCategories(categories || []).filter((category) => category?.slug).map((category) => ({
    url: `${SITE_URL}/category/${category.slug}`,
    lastModified: new Date(category.updated_at),
    changeFrequency: 'hourly',
    priority: 0.6,
  })) || []

  const publishedAuthorSlugs = new Set(
    (articles || [])
      .map((article) => article?.authors?.slug)
      .filter(Boolean)
  )

  const authorEntries = (authors || [])
    .map((author) => {
      const slug = author?.slug && !author.slug.startsWith('@') ? author.slug : author?.id
      if (!slug || !publishedAuthorSlugs.has(slug)) return null
      return {
        url: `${SITE_URL}/authors/${slug}`,
        lastModified: new Date(author.updated_at || Date.now()),
        changeFrequency: 'weekly',
        priority: 0.4,
      }
    })
    .filter(Boolean)

  const tagEntries = tags?.filter((tag) => {
    if (!tag?.slug) return false
    return (tagStats.get(tag.id)?.count || 0) >= 3
  }).map((tag) => ({
    url: `${SITE_URL}/tags/${tag.slug}`,
    lastModified: new Date(tagStats.get(tag.id)?.latestPublishedAt || tag.updated_at || Date.now()),
    changeFrequency: 'weekly',
    priority: 0.5,
  })) || []

  const articleEntries = articles?.filter((article) => article?.slug && !isBlockedCategorySlug(article.categories?.slug)).map((article) => ({
    url: getArticleCanonicalUrl(article),
    lastModified: new Date(article.updated_at || article.published_at || Date.now()),
    changeFrequency: 'daily',
    priority: 0.8,
  })) || []

  const storyEntries = stories?.filter((story) => story?.slug).map((story) => ({
    url: `${SITE_URL}/web-stories/${story.slug}`,
    lastModified: new Date(story.updated_at || story.published_at || Date.now()),
    changeFrequency: 'daily',
    priority: 0.6,
  })) || []

  const entries = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/web-stories`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/latest-news`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/tags`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/about-us`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/editorial-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/corrections-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/advertise`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms-of-service`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    ...categoryHubEntries,
    ...articleEntries,
    ...authorEntries,
    ...tagEntries,
    ...storyEntries,
  ]

  const deduped = new Map()
  for (const entry of entries) {
    if (!entry?.url || deduped.has(entry.url)) continue
    deduped.set(entry.url, entry)
  }

  return [...deduped.values()]
}
