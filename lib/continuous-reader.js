import { createOptionalPublicClient } from '@/lib/supabase/public-server'

const INLINE_ARTICLE_SELECT = `
  id,
  title,
  slug,
  excerpt,
  content,
  featured_image_url,
  featured_image_alt,
  published_at,
  updated_at,
  status,
  category_id,
  author_id,
  authors (id, slug, name, bio, avatar_url, title, email),
  categories (name, slug),
  article_tags (tags (id, name, slug))
`

export function getContinuousReaderClient() {
  return createOptionalPublicClient()
}

export async function getContinuousReaderArticle(supabase, slug) {
  if (!supabase || !slug) return null

  const { data: article } = await supabase
    .from('articles')
    .select(`
      id,
      slug,
      category_id,
      categories (slug)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  return article || null
}

export async function getContinuousReaderArticles(supabase, {
  currentSlug,
  categorySlug,
  excludeSlugs = [],
  limit = 1,
} = {}) {
  if (!supabase || !currentSlug || !categorySlug) return []

  const sourceArticle = await getContinuousReaderArticle(supabase, currentSlug)
  if (!sourceArticle?.category_id) {
    return []
  }

  const excluded = new Set([currentSlug, ...excludeSlugs].filter(Boolean))
  const fetchLimit = Math.min(Math.max(limit + excluded.size + 4, limit), 20)

  const { data: articles } = await supabase
    .from('articles')
    .select(INLINE_ARTICLE_SELECT)
    .eq('category_id', sourceArticle.category_id)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(fetchLimit)

  return (articles || [])
    .filter((article) => article?.slug && !excluded.has(article.slug))
    .map((article) => ({
      ...article,
      categorySlug: article.categories?.slug || categorySlug || 'news',
    }))
    .slice(0, limit)
}
