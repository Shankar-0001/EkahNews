import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiResponse } from '@/lib/api-utils'
import { requireAuth, getUserAuthorId } from '@/lib/auth-utils'
import { resolveCanonicalUrl, slugFromText } from '@/lib/site-config'
import { validateWebStoryPayload } from '@/lib/web-story-validation'
import { normalizeManualKeywords } from '@/lib/keywords'


function normalizeSelectedId(value) {
  if (!value || value === 'none' || value === 'undefined' || value === 'null') return null
  return value
}

function normalizeSlides(slides, storyTitle = '') {
  if (!Array.isArray(slides)) return []
  return slides
    .map((slide) => ({
      media_type: slide?.media_type === 'video' ? 'video' : 'image',
      image: slide?.image || '',
      image_alt: slide?.image_alt || '',
      video: slide?.video || '',
      video_duration: Number(slide?.video_duration) || null,
      headline: slide?.headline || storyTitle || '',
      description: slide?.description || '',
      relatedArticleUrl: slide?.relatedArticleUrl || '',
      cta_text: slide?.cta_text || '',
      cta_url: slide?.cta_url || '',
      whatsapp_group_url: slide?.whatsapp_group_url || '',
      seo_description: slide?.seo_description || '',
    }))
    .filter((slide) => (slide.image || slide.video) && (slide.headline || storyTitle))
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
  revalidatePath('/tags')
  revalidatePath('/web-stories')
  revalidatePath('/web-stories-sitemap.xml')
  revalidatePath('/sitemap.xml')
  if (story?.slug) {
    revalidatePath(`/web-stories/${story.slug}`)
  }
}

const STORY_SELECT = 'id, title, slug, cover_image, cover_image_alt, slides, author_id, category_id, keywords, related_article_slug, cta_text, cta_url, whatsapp_group_url, ad_slot, seo_title, seo_description, canonical_url, structured_data, status, published_at, created_at, updated_at, authors(name, slug), categories(name, slug), web_story_tags(tag_id, tags(id, name, slug))'

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

function normalizeTagIds(value) {
  return [...new Set((Array.isArray(value) ? value : []).filter(Boolean))]
}

async function getTagsByIds(supabase, tagIds = []) {
  if (!tagIds.length) return []

  const { data: tags } = await supabase
    .from('tags')
    .select('id, name, slug')
    .in('id', tagIds)

  return tags || []
}

async function syncStoryTags(supabase, storyId, tagIds = []) {
  const normalizedTagIds = normalizeTagIds(tagIds)

  const { error: deleteError } = await supabase
    .from('web_story_tags')
    .delete()
    .eq('web_story_id', storyId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  if (normalizedTagIds.length === 0) {
    return []
  }

  const { error: insertError } = await supabase
    .from('web_story_tags')
    .insert(normalizedTagIds.map((tagId) => ({
      web_story_id: storyId,
      tag_id: tagId,
    })))

  if (insertError) {
    throw new Error(insertError.message)
  }

  return getTagsByIds(supabase, normalizedTagIds)
}

function revalidateTagSurfaces(tags = []) {
  for (const tag of tags) {
    if (tag?.slug) {
      revalidatePath(`/tags/${tag.slug}`)
    }
  }
}

export async function GET(request) {
  try {
    const user = await requireAuth()
    const supabase = createAdminClient()
    const search = new URL(request.url).searchParams
    const page = Math.max(1, Number(search.get('page') || 1))
    const limit = Math.min(50, Math.max(1, Number(search.get('limit') || 24)))
    const from = (page - 1) * limit
    const to = from + limit - 1
    let query = supabase
      .from('web_stories')
      .select(STORY_SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (user.role !== 'admin') {
      const authorId = await getUserAuthorId(user.userId)
      if (!authorId) {
        return apiResponse(200, {
          stories: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0,
          },
        })
      }

      query = query.eq('author_id', authorId)
    }

    const { data, count, error } = await query
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
    console.error('Web stories GET error:', error)
    return apiResponse(500, null, 'An internal error occurred')
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth()
    const supabase = createAdminClient()
    const payload = await request.json()
    const keywords = normalizeManualKeywords(payload.keywords || [])
    const tagIds = normalizeTagIds(payload.tags)
    let authorId = normalizeSelectedId(payload.author_id)
    const categoryId = normalizeSelectedId(payload.category_id)
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
    const coverImage = payload.cover_image || slides[0].image || ''
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
      console.warn('Web story create validation failed', {
        title,
        status: finalStatus,
        issues: validation.issues,
      })
      return apiResponse(422, null, {
        message: validation.issues[0],
        issues: validation.issues,
      })
    }

    const canonicalUrl = resolveCanonicalUrl(payload.canonical_url, buildStoryPath(slug))
    const insertData = {
      title,
      slug,
      cover_image: coverImage,
      cover_image_alt: payload.cover_image_alt?.trim() || title,
      slides,
      author_id: authorId,
      category_id: categoryId,
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

    const syncedTags = tagIds.length > 0
      ? await syncStoryTags(supabase, data.id, tagIds)
      : []

    revalidateStorySurface(data)
    revalidateTagSurfaces(syncedTags)
    return apiResponse(201, { story: data })
  } catch (error) {
    if (error.name === 'AuthError') return apiResponse(401, null, error.message)
    console.error('Web stories POST error:', error)
    return apiResponse(500, null, 'An internal error occurred')
  }
}





