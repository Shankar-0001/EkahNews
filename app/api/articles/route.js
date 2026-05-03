import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiResponse, logger } from '@/lib/api-utils'
import { validateArticle, ValidationError } from '@/lib/validation'
import { requireRequestAuth, getUserAuthorId } from '@/lib/auth-utils'
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

async function findDuplicateArticleByTitle(admin, title) {
  const { data } = await admin
    .from('articles')
    .select('id')
    .in('status', ['draft', 'published'])
    .ilike('title', title.trim())
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
    logger.warn('[POST-article] Revalidate failed', { error: error?.message || String(error) })
  }
}

export async function POST(request) {
  const requestId = 'POST-article'

  try {
    const rateResult = checkRateLimit({
      key: `${getClientIp(request)}:articles:create`,
      limit: 30,
      windowMs: 60 * 1000,
    })

    if (!rateResult.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 429,
          error: 'Too many article creation requests. Please try again shortly.',
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

    const articleData = await request.json()
    articleData.title = articleData.title?.trim?.() || articleData.title
    articleData.keywords = normalizeManualKeywords(articleData.keywords || [])
    articleData.schema_type = articleData.schema_type || 'NewsArticle'
    validateArticle(articleData)

    const admin = createAdminClient()
    const duplicateArticle = await findDuplicateArticleByTitle(admin, articleData.title)
    if (duplicateArticle) {
      return apiResponse(409, null, 'An article with this title already exists. Please use a unique title.')
    }

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

    if (user.role !== 'admin') {
      articleData.status = 'pending'
      delete articleData.published_at
    }

    const sanitizedContent = sanitizeRichText(articleData.content)
    const structuredData = normalizeStructuredData(articleData.structured_data)
    const publishedAt = articleData.status === 'published'
      ? (articleData.published_at || new Date().toISOString())
      : (articleData.published_at || null)
    const insertPayload = {
      ...articleData,
      author_id: authorId,
      content: sanitizedContent,
      keywords: articleData.keywords,
      canonical_url: articleData.canonical_url || null,
      schema_type: articleData.schema_type || 'NewsArticle',
      structured_data: structuredData,
      published_at: publishedAt,
      updated_at: articleData.updated_at || new Date().toISOString(),
      og_image: articleData.og_image?.trim() || null,
    }

    let article
    let error
    ;({ data: article, error } = await admin
      .from('articles')
      .insert([insertPayload])
      .select('id, title, slug, excerpt, content, content_json, featured_image_url, featured_image_alt, keywords, status, category_id, author_id, seo_title, seo_description, canonical_url, schema_type, structured_data, published_at, created_at, updated_at, categories(slug), authors(slug)')
      .single())

    if (error && isMissingOgImageColumnError(error)) {
      const { og_image, ...fallbackPayload } = insertPayload
      ;({ data: article, error } = await admin
        .from('articles')
        .insert([fallbackPayload])
        .select('id, title, slug, excerpt, content, content_json, featured_image_url, featured_image_alt, keywords, status, category_id, author_id, seo_title, seo_description, canonical_url, schema_type, structured_data, published_at, created_at, updated_at, categories(slug), authors(slug)')
        .single())
    }

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
    return apiResponse(500, null, 'An internal error occurred')
  }
}
