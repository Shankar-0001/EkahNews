import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiResponse, logger } from '@/lib/api-utils'
import { validateArticle, ValidationError } from '@/lib/validation'
import { requireRequestAuth, getUserAuthorId } from '@/lib/auth-utils'
import { sanitizeRichText } from '@/lib/security-utils'
import { normalizeManualKeywords } from '@/lib/keywords'
import { validateArticlePublishReadiness } from '@/lib/article-publish-validation'

function normalizeStructuredData(value) {
  if (!value) return null
  if (typeof value !== 'string') return value

  try {
    return JSON.parse(value)
  } catch {
    throw new ValidationError('Structured data override must be valid JSON', {
      structured_data: 'Structured data override must be valid JSON',
    })
  }
}

function revalidateArticleSurface(article) {
  const categorySlug = article?.categories?.slug || 'news'
  if (article?.slug) {
    revalidatePath(`/${categorySlug}/${article.slug}`)
  }
  revalidatePath('/')
  revalidatePath(`/category/${categorySlug}`)
  revalidatePath('/sitemap.xml')
  revalidatePath('/article-sitemap.xml')
  revalidatePath('/news-sitemap.xml')
  revalidatePath('/category-sitemap.xml')
  if (article?.authors?.slug) {
    revalidatePath(`/authors/${article.authors.slug}`)
  }
}

export async function POST(request) {
  const requestId = 'POST-article'

  try {
    const user = await requireRequestAuth(request)
    logger.info(`[${requestId}] User authenticated`, { userId: user.userId })

    const articleData = await request.json()
    articleData.keywords = normalizeManualKeywords(articleData.keywords || [])
    articleData.schema_type = articleData.schema_type || 'NewsArticle'
    validateArticle(articleData)

    const admin = createAdminClient()
    let authorId = await getUserAuthorId(user.userId)

    if (user.role === 'admin' && articleData.author_id) {
      const { data: authorRecord } = await admin
        .from('authors')
        .select('id')
        .eq('id', articleData.author_id)
        .single()
      if (authorRecord) {
        authorId = authorRecord.id
      }
    }

    if (!authorId) {
      logger.warn(`[${requestId}] User has no author profile`, { userId: user.userId })
      return apiResponse(400, null, 'User must have an author profile')
    }

    await validateArticlePublishReadiness(admin, articleData)

    const sanitizedContent = sanitizeRichText(articleData.content)
    const structuredData = normalizeStructuredData(articleData.structured_data)
    const publishedAt = articleData.status === 'published'
      ? (articleData.published_at || new Date().toISOString())
      : (articleData.published_at || null)

    const { data: article, error } = await admin
      .from('articles')
      .insert([{
        ...articleData,
        author_id: authorId,
        content: sanitizedContent,
        keywords: articleData.keywords,
        canonical_url: articleData.canonical_url || null,
        schema_type: articleData.schema_type || 'NewsArticle',
        structured_data: structuredData,
        published_at: publishedAt,
        updated_at: articleData.updated_at || new Date().toISOString(),
      }])
      .select('id, title, slug, excerpt, content, content_json, featured_image_url, featured_image_alt, keywords, status, category_id, author_id, seo_title, seo_description, canonical_url, schema_type, structured_data, published_at, created_at, updated_at, categories(slug), authors(slug)')
      .single()

    if (error) {
      logger.error(`[${requestId}] Database error`, error)
      return apiResponse(400, null, error.message)
    }

    revalidateArticleSurface(article)
    logger.info(`[${requestId}] Article created`, { articleId: article.id })
    return apiResponse(201, { article })
  } catch (error) {
    if (error.name === 'ValidationError') {
      return apiResponse(422, null, error.fields || error.message)
    }
    if (error.name === 'AuthError') {
      return apiResponse(401, null, error.message)
    }

    logger.error(requestId, error)
    return apiResponse(500, null, error.message || 'Internal server error')
  }
}
