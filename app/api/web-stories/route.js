import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { apiResponse } from '@/lib/api-utils'
import { requireAuth, getUserAuthorId } from '@/lib/auth-utils'
import { resolveCanonicalUrl, slugFromText } from '@/lib/site-config'
import { validateWebStoryPayload } from '@/lib/web-story-validation'
import { normalizeManualKeywords } from '@/lib/keywords'

function normalizeSlides(slides, storyTitle = '') {
  if (!Array.isArray(slides)) return []
  return slides
    .map((slide) => ({
      image: slide?.image || '',
      image_alt: slide?.image_alt || '',
      headline: slide?.headline || storyTitle || '',
      description: slide?.description || '',
      relatedArticleUrl: slide?.relatedArticleUrl || '',
      cta_text: slide?.cta_text || '',
      cta_url: slide?.cta_url || '',
      whatsapp_group_url: slide?.whatsapp_group_url || '',
      seo_description: slide?.seo_description || '',
    }))
    .filter((slide) => slide.image && (slide.headline || storyTitle))
}

function deriveStoryCtas(slides = []) {
  const readMoreSlide = (slides || []).find((slide) => slide?.cta_url || slide?.cta_text)
  const whatsappSlide = (slides || []).find((slide) => slide?.whatsapp_group_url)
  return {
    cta_text: readMoreSlide?.cta_text || null,
    cta_url: readMoreSlide?.cta_url || null,
    whatsapp_group_url: whatsappSlide?.whatsapp_group_url || null,
  }
}

function revalidateStorySurface(story) {
  revalidatePath('/web-stories')
  revalidatePath('/web-stories-sitemap.xml')
  revalidatePath('/sitemap.xml')
  if (story?.slug) {
    revalidatePath(`/web-stories/${story.slug}`)
  }
}

const STORY_SELECT = 'id, title, slug, cover_image, cover_image_alt, slides, author_id, category_id, tags, keywords, related_article_slug, cta_text, cta_url, whatsapp_group_url, ad_slot, seo_title, seo_description, canonical_url, structured_data, status, published_at, created_at, updated_at, authors(name, slug), categories(name, slug)'

function normalizeStructuredData(value) {
  if (!value) return null
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function toIsoDateTime(value) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function buildStoryPath(slug = '') {
  return `/web-stories/${slug}`
}

export async function GET(request) {
  try {
    await requireAuth()
    const supabase = await createClient()
    const search = new URL(request.url).searchParams
    const page = Math.max(1, Number(search.get('page') || 1))
    const limit = Math.min(50, Math.max(1, Number(search.get('limit') || 24)))
    const from = (page - 1) * limit
    const to = from + limit - 1
    const { data, count, error } = await supabase
      .from('web_stories')
      .select(STORY_SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
    if (error) return apiResponse(500, null, error.message)
    return apiResponse(200, {
      stories: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    if (error.name === 'AuthError') return apiResponse(401, null, error.message)
    return apiResponse(500, null, error.message || 'Failed to fetch stories')
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const payload = await request.json()
    const keywords = normalizeManualKeywords(payload.keywords || [])
    let authorId = payload.author_id || null
    const ownAuthorId = await getUserAuthorId(user.userId)

    if (user.role === 'admin') {
      if (authorId) {
        const { data: selectedAuthor } = await supabase
          .from('authors')
          .select('id')
          .eq('id', authorId)
          .maybeSingle()
        if (!selectedAuthor) return apiResponse(422, null, 'Selected author not found')
      } else {
        authorId = ownAuthorId
      }
    } else {
      if (!authorId) {
        authorId = ownAuthorId
      } else {
        const { data: selectedAuthor } = await supabase
          .from('authors')
          .select('id, user_id')
          .eq('id', authorId)
          .maybeSingle()
        if (!selectedAuthor) return apiResponse(422, null, 'Selected author not found')
        if (selectedAuthor.user_id !== user.userId) {
          return apiResponse(403, null, 'Authors can only select their own author profile')
        }
      }
    }

    if (!authorId) return apiResponse(400, null, 'Author profile is required')
    const titleFromPayload = (payload.title || '').trim()
    const title = titleFromPayload || (Array.isArray(payload.slides) ? (payload.slides[0]?.headline || '').trim() : '')
    if (!title) return apiResponse(422, null, 'Title is required')

    const slides = normalizeSlides(payload.slides, title)
    if (slides.length === 0) return apiResponse(422, null, 'At least one valid slide is required')

    const storyCtas = deriveStoryCtas(slides)
    const slug = payload.slug ? slugFromText(payload.slug) : slugFromText(title)
    const requestedStatus = payload.status || 'draft'
    const finalStatus = user.role === 'author' && requestedStatus === 'published'
      ? 'pending'
      : requestedStatus
    const normalizedPublishedAt = finalStatus === 'published'
      ? (toIsoDateTime(payload.published_at) || new Date().toISOString())
      : null
    const normalizedUpdatedAt = toIsoDateTime(payload.updated_at) || new Date().toISOString()
    const derivedSeoDescription = payload.seo_description || slides.find((s) => s.seo_description)?.seo_description || null
    const coverImage = payload.cover_image || slides[0].image
    const validation = validateWebStoryPayload({
      title,
      coverImage,
      coverImageAlt: payload.cover_image_alt || title,
      slides,
      seoTitle: payload.seo_title || title,
      seoDescription: derivedSeoDescription || '',
      canonicalUrl: payload.canonical_url || '',
      structuredData: payload.structured_data || null,
      publishedAt: normalizedPublishedAt,
      updatedAt: normalizedUpdatedAt,
      status: finalStatus,
    })
    if (!validation.valid) {
      return apiResponse(422, null, validation.issues[0])
    }

    const canonicalUrl = resolveCanonicalUrl(payload.canonical_url, buildStoryPath(slug))
    const insertData = {
      title,
      slug,
      cover_image: coverImage,
      cover_image_alt: payload.cover_image_alt?.trim() || title,
      slides,
      author_id: authorId,
      category_id: payload.category_id || null,
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      keywords,
      related_article_slug: payload.related_article_slug || null,
      cta_text: storyCtas.cta_text,
      cta_url: storyCtas.cta_url,
      whatsapp_group_url: storyCtas.whatsapp_group_url,
      ad_slot: payload.ad_slot || null,
      seo_title: payload.seo_title?.trim() || title,
      seo_description: derivedSeoDescription,
      canonical_url: canonicalUrl,
      structured_data: normalizeStructuredData(payload.structured_data),
      status: finalStatus,
      published_at: normalizedPublishedAt,
      updated_at: normalizedUpdatedAt,
    }

    const { data, error } = await supabase
      .from('web_stories')
      .insert(insertData)
      .select(STORY_SELECT)
      .single()
    if (error) return apiResponse(500, null, error.message)

    revalidateStorySurface(data)
    return apiResponse(201, { story: data })
  } catch (error) {
    if (error.name === 'AuthError') return apiResponse(401, null, error.message)
    return apiResponse(500, null, error.message || 'Failed to create story')
  }
}

