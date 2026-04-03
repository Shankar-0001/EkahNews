import { createOptionalPublicClient } from '@/lib/supabase/public-server'
import { getArticleCanonicalUrl, SITE_URL } from '@/lib/site-config'

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
    { data: tagLinks },
    { data: stories },
  ] = await Promise.all([
    supabase
      .from('categories')
      .select('slug, updated_at'),
    supabase
      .from('articles')
      .select('slug, canonical_url, updated_at, published_at, categories(slug)')
      .eq('status', 'published')
      .order('published_at', { ascending: false }),
    supabase
      .from('article_tags')
      .select('tag_id, articles!inner(status)')
      .eq('articles.status', 'published'),
    supabase
      .from('web_stories')
      .select('slug, updated_at, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false }),
  ])

  const tagIds = [...new Set((tagLinks || []).map((row) => row.tag_id).filter(Boolean))]
  const { data: tags } = tagIds.length
    ? await supabase
      .from('tags')
      .select('id, slug, updated_at')
      .in('id', tagIds)
    : { data: [] }

  const categoryHubEntries = categories?.filter((category) => category?.slug).map((category) => ({
    url: `${SITE_URL}/category/${category.slug}`,
    lastModified: new Date(category.updated_at),
    changeFrequency: 'daily',
    priority: 0.7,
  })) || []

  const tagEntries = tags?.filter((tag) => tag?.slug).map((tag) => ({
    url: `${SITE_URL}/tags/${tag.slug}`,
    lastModified: new Date(tag.updated_at),
    changeFrequency: 'weekly',
    priority: 0.5,
  })) || []

  const articleEntries = articles?.filter((article) => article?.slug).map((article) => ({
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
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/web-stories`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/about-us`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/editorial-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/corrections-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/advertise`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    ...categoryHubEntries,
    ...articleEntries,
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

