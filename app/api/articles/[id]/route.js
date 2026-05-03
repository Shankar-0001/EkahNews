import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiResponse, logger } from '@/lib/api-utils'
import { validateArticle, ValidationError } from '@/lib/validation'
import { requireRequestAuth, canEditArticle, canDeleteArticle } from '@/lib/auth-utils'
import { sanitizeRichText } from '@/lib/security-utils'
import { normalizeManualKeywords } from '@/lib/keywords'
import { validateArticlePublishReadiness } from '@/lib/article-publish-validation'
import { checkRateLimit, getClientIp } from '@/lib/request-guards'

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

function isMissingOgImageColumnError(error) {
  const message = error?.message || ''
  return typeof message === 'string'
    && message.includes('og_image')
    && message.toLowerCase().includes('column')
}

async function findDuplicateArticleByTitle(admin, title, excludeId) {
  const { data } = await admin
    .from('articles')
    .select('id')
    .in('status', ['draft', 'published'])
    .ilike('title', title.trim())
    .neq('id', excludeId)
    .limit(1)
    .maybeSingle()

  return data
}

function revalidateArticleSurface(article) {
  try {
    const categorySlug = article?.categories?.slug || 'news'
    if (article?.slug) {
      revalidatePath(`/${categorySlug}/${article.slug}`)
    }
    revalidatePath('/')
    revalidatePath('/latest-news')
    revalidatePath(`/category/${categorySlug}`)
    revalidatePath('/sitemap.xml')
    revalidatePath('/article-sitemap.xml')
    revalidatePath('/news-sitemap.xml')
    revalidatePath('/category-sitemap.xml')
    if (article?.authors?.slug) {
      revalidatePath(`/authors/${article.authors.slug}`)
    }
  } catch (error) {
    logger.warn('[PATCH-article] Revalidate failed', { error: error?.message || String(error) })
  }
}

export async function PATCH(request, { params }) {
  const requestId = `PATCH-article-${params.id}`
  const AUTHOR_ALLOWED_STATUSES = ['draft', 'pending']

  try {
    const rateResult = checkRateLimit({
      key: `${getClientIp(request)}:articles:update`,
      limit: 60,
      windowMs: 60 * 1000,
    })

    if (!rateResult.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 429,
          error: 'Too many article update requests. Please try again shortly.',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.max(1, Math.ceil((rateResult.resetAt - Date.now()) / 1000))),
          },
        }
      )
    }

    const user = await requireRequestAuth(request)
    logger.info(`[${requestId}] User authenticated`, { userId: user.userId })

    let data
    try {
      data = await request.json()
    } catch {
      return apiResponse(400, null, 'Invalid JSON payload')
    }
    data.title = data.title?.trim?.() || data.title
    data.keywords = normalizeManualKeywords(data.keywords || [])
    data.schema_type = data.schema_type || 'NewsArticle'
    validateArticle(data)

    const canEdit = await canEditArticle(params.id, user)
    if (!canEdit) {
      logger.warn(`[${requestId}] Permission denied`, { userId: user.userId, articleId: params.id })
      return apiResponse(403, null, 'Forbidden: Cannot edit this article')
    }

    if (user.role !== 'admin' && data.status !== undefined) {
      if (!AUTHOR_ALLOWED_STATUSES.includes(data.status)) {
        return apiResponse(403, null, 'Authors cannot publish articles directly. Submit for review instead.')
      }
    }

    const admin = createAdminClient()
    const duplicateArticle = await findDuplicateArticleByTitle(admin, data.title, params.id)
    if (duplicateArticle) {
      return apiResponse(409, null, 'An article with this title already exists. Please use a unique title.')
    }

    const { data: existingArticle } = await admin
      .from('articles')
      .select('slug, excerpt, featured_image_url, featured_image_alt, seo_description, published_at, categories(slug), authors(slug)')
      .eq('id', params.id)
      .maybeSingle()

    if (!existingArticle) {
      return apiResponse(404, null, 'Article not found')
    }

    const publishCandidate = {
      ...existingArticle,
      ...data,
      excerpt: data.excerpt ?? existingArticle.excerpt,
      featured_image_url: data.featured_image_url ?? existingArticle.featured_image_url,
      featured_image_alt: data.featured_image_alt ?? existingArticle.featured_image_alt,
      seo_description: data.seo_description ?? existingArticle.seo_description,
      status: data.status || 'draft',
    }

    await validateArticlePublishReadiness(admin, publishCandidate)

    const structuredData = normalizeStructuredData(data.structured_data)
    const updatePayload = {
      ...data,
      content: sanitizeRichText(data.content),
      canonical_url: data.canonical_url || null,
      schema_type: data.schema_type || 'NewsArticle',
      structured_data: structuredData,
      og_image: data.og_image?.trim() || null,
      updated_at: data.updated_at || new Date().toISOString(),
    }

    if (!updatePayload.published_at && updatePayload.status === 'published') {
      updatePayload.published_at = existingArticle.published_at || new Date().toISOString()
    }

    if (user.role !== 'admin') {
      delete updatePayload.author_id
    }

    let updatedArticle
    let error
    ;({ data: updatedArticle, error } = await admin
      .from('articles')
      .update(updatePayload)
      .eq('id', params.id)
      .select('id, title, slug, excerpt, content, content_json, featured_image_url, featured_image_alt, keywords, status, category_id, author_id, seo_title, seo_description, canonical_url, schema_type, structured_data, published_at, created_at, updated_at, categories(slug), authors(slug)')
      .single())

    if (error && isMissingOgImageColumnError(error)) {
      const { og_image, ...fallbackPayload } = updatePayload
      ;({ data: updatedArticle, error } = await admin
        .from('articles')
        .update(fallbackPayload)
        .eq('id', params.id)
        .select('id, title, slug, excerpt, content, content_json, featured_image_url, featured_image_alt, keywords, status, category_id, author_id, seo_title, seo_description, canonical_url, schema_type, structured_data, published_at, created_at, updated_at, categories(slug), authors(slug)')
        .single())
    }

    if (error) {
      logger.error(`[${requestId}] Database error`, error)
      return apiResponse(400, null, error.message)
    }

    revalidateArticleSurface(existingArticle)
    revalidateArticleSurface(updatedArticle)

    logger.info(`[${requestId}] Article updated successfully`)
    return apiResponse(200, { article: updatedArticle })
  } catch (error) {
    if (error.name === 'ValidationError') {
      return apiResponse(422, null, error.fields || error.message)
    }
    if (error.name === 'AuthError') {
      return apiResponse(error.message.includes('Forbidden') ? 403 : 401, null, error.message)
    }

    logger.error(requestId, error)
    return apiResponse(500, null, 'An internal error occurred')
  }
}

export async function DELETE(request, { params }) {
  const requestId = `DELETE-article-${params.id}`

  try {
    const rateResult = checkRateLimit({
      key: `${getClientIp(request)}:articles:delete`,
      limit: 20,
      windowMs: 60 * 1000,
    })

    if (!rateResult.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 429,
          error: 'Too many article delete requests. Please try again shortly.',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.max(1, Math.ceil((rateResult.resetAt - Date.now()) / 1000))),
          },
        }
      )
    }

    const user = await requireRequestAuth(request)
    logger.info(`[${requestId}] User authenticated`, { userId: user.userId })

    const canDelete = await canDeleteArticle(params.id, user)
    if (!canDelete) {
      logger.warn(`[${requestId}] Permission denied`, { userId: user.userId })
      return apiResponse(403, null, 'Forbidden: Cannot delete this article')
    }

    const admin = createAdminClient()
    const { data: existingArticle } = await admin
      .from('articles')
      .select('slug, categories(slug), authors(slug)')
      .eq('id', params.id)
      .maybeSingle()

    const { error } = await admin
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
    return apiResponse(500, null, 'An internal error occurred')
  }
}
