import { createClient } from '@/lib/supabase/server'

export default async function sitemap() {
  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ekahnews.com'

  // Get all categories
  const { data: categories } = await supabase
    .from('categories')
    .select('slug, updated_at')

  // Get tags that have at least one published article
  const { data: tagLinks } = await supabase
    .from('article_tags')
    .select('tag_id, articles!inner(status)')
    .eq('articles.status', 'published')

  const tagIds = [...new Set((tagLinks || []).map((row) => row.tag_id).filter(Boolean))]
  const { data: tags } = tagIds.length
    ? await supabase
      .from('tags')
      .select('id, slug, updated_at')
      .in('id', tagIds)
    : { data: [] }

  const categoryHubEntries = categories?.map((category) => ({
    url: `${siteUrl}/category/${category.slug}`,
    lastModified: new Date(category.updated_at),
    changeFrequency: 'daily',
    priority: 0.7,
  })) || []

  const tagEntries = tags?.map((tag) => ({
    url: `${siteUrl}/tags/${tag.slug}`,
    lastModified: new Date(tag.updated_at),
    changeFrequency: 'weekly',
    priority: 0.5,
  })) || []

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/web-stories`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${siteUrl}/about-us`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${siteUrl}/editorial-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${siteUrl}/corrections-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    ...categoryHubEntries,
    ...tagEntries,
  ]
}


