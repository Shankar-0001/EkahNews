import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { apiResponse, logger } from '@/lib/api-utils'
import { validateArticle } from '@/lib/validation'
import { requireAuth, canEditArticle, canDeleteArticle } from '@/lib/auth-utils'
import { sanitizeRichText } from '@/lib/security-utils'
import { normalizeManualKeywords } from '@/lib/keywords'

function normalizeStructuredData(value) {
  if (!value) return null
  if (typeof value === 'string') return JSON.parse(value)
  return value
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

export async function PATCH(request, { params }) {
  const requestId = `PATCH-article-${params.id}`

  try {
    const user = await requireAuth()
    logger.info(`[${requestId}] User authenticated`, { userId: user.userId })

    const data = await request.json()
    data.keywords = normalizeManualKeywords(data.keywords || [])
    data.schema_type = data.schema_type || 'NewsArticle'
    validateArticle(data)

    const canEdit = await canEditArticle(params.id, user)
    if (!canEdit) {
      logger.warn(`[${requestId}] Permission denied`, { userId: user.userId, articleId: params.id })
      return apiResponse(403, null, 'Forbidden: Cannot edit this article')
    }

    const supabase = await createClient()
    const { data: existingArticle } = await supabase
      .from('articles')
      .select('slug, categories(slug), authors(slug)')
      .eq('id', params.id)
      .maybeSingle()

    const updatePayload = {
      ...data,
      content: sanitizeRichText(data.content),
      canonical_url: data.canonical_url || null,
      schema_type: data.schema_type || 'NewsArticle',
      structured_data: normalizeStructuredData(data.structured_data),
      updated_at: data.updated_at || new Date().toISOString(),
    }

    if (user.role !== 'admin') {
      delete updatePayload.author_id
    }

    const { data: updatedArticle, error } = await supabase
      .from('articles')
      .update(updatePayload)
      .eq('id', params.id)
      .select('id, title, slug, excerpt, content, content_json, featured_image_url, featured_image_alt, keywords, status, category_id, author_id, seo_title, seo_description, canonical_url, schema_type, structured_data, published_at, created_at, updated_at, categories(slug), authors(slug)')
      .single()

    if (error) {
      logger.error(`[${requestId}] Database error`, error)
      return apiResponse(400, null, error.message)
    }

    if (existingArticle) {
      revalidateArticleSurface(existingArticle)
    }
    revalidateArticleSurface(updatedArticle)

    logger.info(`[${requestId}] Article updated successfully`)
    return apiResponse(200, { article: updatedArticle })
  } catch (error) {
    if (error.name === 'ValidationError') {
      return apiResponse(422, null, error.message)
    }
    if (error.name === 'AuthError') {
      return apiResponse(error.message.includes('Forbidden') ? 403 : 401, null, error.message)
    }

    logger.error(requestId, error)
    return apiResponse(500, null, 'Internal server error')
  }
}

export async function DELETE(request, { params }) {
  const requestId = `DELETE-article-${params.id}`

  try {
    const user = await requireAuth()
    logger.info(`[${requestId}] User authenticated`, { userId: user.userId })

    const canDelete = await canDeleteArticle(params.id, user)
    if (!canDelete) {
      logger.warn(`[${requestId}] Permission denied`, { userId: user.userId })
      return apiResponse(403, null, 'Forbidden: Cannot delete this article')
    }

    const supabase = await createClient()
    const { data: existingArticle } = await supabase
      .from('articles')
      .select('slug, categories(slug), authors(slug)')
      .eq('id', params.id)
      .maybeSingle()

    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', params.id)

    if (error) {
      logger.error(`[${requestId}] Database error`, error)
      return apiResponse(400, null, error.message)
    }

    if (existingArticle) {
      revalidateArticleSurface(existingArticle)
    }

    logger.info(`[${requestId}] Article deleted successfully`)
    return apiResponse(200, { success: true })
  } catch (error) {
    if (error.name === 'AuthError') {
      return apiResponse(error.message.includes('Forbidden') ? 403 : 401, null, error.message)
    }

    logger.error(requestId, error)
    return apiResponse(500, null, 'Internal server error')
  }
}
