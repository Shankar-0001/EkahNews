import { atomicArticleArguments, assertDeploymentTarget } from '@/lib/atomic-article.mjs'
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
    revalidatePath('/', 'layout')
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
    assertDeploymentTarget()
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
    atomicArticleArguments(data, params.id)
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
      .select('slug, excerpt, featured_image_url, featured_image_alt, seo_description, published_at, categories:categories!articles_category_id_fkey(slug), authors(slug)')
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

    if (!updatePayload.published_at && existingArticle.published_at) updatePayload.published_at = existingArticle.published_at
    if (!updatePayload.published_at && updatePayload.status === 'published') {
      updatePayload.published_at = existingArticle.published_at || new Date().toISOString()
    }

    if (user.role !== 'admin') {
      delete updatePayload.author_id
    }

    const { data: updatedArticle, error } = await admin.rpc(
      'save_article_with_taxonomy', atomicArticleArguments(updatePayload, params.id)
    )

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
    assertDeploymentTarget()
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
      .select('slug, categories:categories!articles_category_id_fkey(slug), authors(slug)')
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

export async function GET(request, { params }) {
  try {
    assertDeploymentTarget()
    const user=await requireRequestAuth(request)
    if (!await canEditArticle(params.id,user)) return apiResponse(403,null,'Cannot view this article in the editor')
    const {data,error}=await createAdminClient().from('articles').select('*,article_tags(tag_id),article_categories(category_id,is_primary),article_topics(topic_id)').eq('id',params.id).single()
    if(error) return apiResponse(404,null,'Article not found')
    return apiResponse(200,{article:data})
  } catch(error) {return apiResponse(error.name==='AuthError'?401:500,null,'Article could not be loaded')}
}
