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

async function getStoryTags(supabase, storyId) {
  const { data } = await supabase
    .from('web_story_tags')
    .select('tag_id, tags(id, name, slug)')
    .eq('web_story_id', storyId)

  return data || []
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

async function canMutateStory(supabase, storyId, user) {
  if (user.role === 'admin') return true
  const authorId = await getUserAuthorId(user.userId)
  if (!authorId) return false
  const { data: story } = await supabase
    .from('web_stories')
    .select('author_id')
    .eq('id', storyId)
    .maybeSingle()
  return story?.author_id === authorId
}

export async function GET(_request, { params }) {
  try {
    const user = await requireAuth()
    const supabase = createAdminClient()
    const allowed = await canMutateStory(supabase, params.id, user)
    if (!allowed) return apiResponse(403, null, 'Forbidden')

    const { data, error } = await supabase
      .from('web_stories')
      .select(STORY_SELECT)
      .eq('id', params.id)
      .maybeSingle()
    if (error) return apiResponse(500, null, error.message)
    if (!data) return apiResponse(404, null, 'Story not found')
    return apiResponse(200, { story: data })
  } catch (error) {
    if (error.name === 'AuthError') return apiResponse(401, null, error.message)
    console.error(error)
    return apiResponse(500, null, 'An internal error occurred')
  }
}

export async function PATCH(request, { params }) {
  try {
    const user = await requireAuth()
    const supabase = createAdminClient()
    const allowed = await canMutateStory(supabase, params.id, user)
    if (!allowed) return apiResponse(403, null, 'Forbidden')

    const payload = await request.json()
    const { data: existingStory } = await supabase
      .from('web_stories')
      .select('title, slug, cover_image, cover_image_alt, slides, seo_title, seo_description, canonical_url, structured_data, status, published_at')
      .eq('id', params.id)
      .maybeSingle()
    const incomingTagIds = 'tags' in payload ? normalizeTagIds(payload.tags) : null
    const existingStoryTags = incomingTagIds !== null
      ? await getStoryTags(supabase, params.id)
      : []

    const updates = {
      updated_at: toIsoDateTime(payload.updated_at) || new Date().toISOString(),
    }

    if (typeof payload.title === 'string' && payload.title.trim()) updates.title = payload.title.trim()
    if (typeof payload.slug === 'string' && payload.slug.trim()) updates.slug = slugFromText(payload.slug)
    if (typeof payload.cover_image === 'string' && payload.cover_image.trim()) updates.cover_image = payload.cover_image
    if (typeof payload.cover_image_alt === 'string') updates.cover_image_alt = payload.cover_image_alt.trim() || null
    if ('keywords' in payload) updates.keywords = normalizeManualKeywords(payload.keywords || [])
    if ('related_article_slug' in payload) updates.related_article_slug = payload.related_article_slug || null
    if ('seo_title' in payload) updates.seo_title = payload.seo_title?.trim() || null
    if ('seo_description' in payload) updates.seo_description = payload.seo_description?.trim() || null
    if ('structured_data' in payload) updates.structured_data = normalizeStructuredData(payload.structured_data)
    updates.cta_text = payload.cta_text || null
    updates.cta_url = payload.cta_url || null
    updates.whatsapp_group_url = payload.whatsapp_group_url || null
    updates.ad_slot = payload.ad_slot || null
    if ('category_id' in payload) updates.category_id = normalizeSelectedId(payload.category_id)

    const requestedStatus = payload.status || existingStory?.status || 'draft'
    updates.status = user.role === 'author'
      ? (existingStory?.status === 'published'
        ? 'published'
        : (requestedStatus === 'published' ? 'pending' : requestedStatus))
      : requestedStatus

    if ('published_at' in payload || updates.status !== existingStory?.status) {
      updates.published_at = updates.status === 'published'
        ? (toIsoDateTime(payload.published_at) || existingStory?.published_at || new Date().toISOString())
        : null
    }

    const normalizedAuthorId = normalizeSelectedId(payload.author_id)

    if ('author_id' in payload && normalizedAuthorId) {
      if (user.role === 'admin') {
        const { data: selectedAuthor } = await supabase
          .from('authors')
          .select('id')
          .eq('id', normalizedAuthorId)
          .maybeSingle()
        if (!selectedAuthor) return apiResponse(422, null, 'Selected author not found')
        updates.author_id = normalizedAuthorId
      } else {
        const { data: selectedAuthor } = await supabase
          .from('authors')
          .select('id, user_id')
          .eq('id', normalizedAuthorId)
          .maybeSingle()
        if (!selectedAuthor) return apiResponse(422, null, 'Selected author not found')
        if (selectedAuthor.user_id !== user.userId) {
          return apiResponse(403, null, 'Authors can only select their own author profile')
        }
        updates.author_id = normalizedAuthorId
      }
    }

    const effectiveTitle = updates.title || existingStory?.title || ''
    if (payload.slides) {
      const slides = normalizeSlides(payload.slides, effectiveTitle)
      if (slides.length === 0) return apiResponse(422, null, 'At least one valid slide is required')
      const storyCtas = deriveStoryCtas(slides)
      updates.cta_text = storyCtas.cta_text
      updates.cta_url = storyCtas.cta_url
      updates.whatsapp_group_url = storyCtas.whatsapp_group_url
      updates.slides = slides
      if (!updates.cover_image) updates.cover_image = slides[0].image || existingStory?.cover_image || ''
      if (!updates.title) updates.title = effectiveTitle || slides[0].headline
      if (!updates.slug) updates.slug = slugFromText(updates.title)
      if (!updates.seo_description) {
        updates.seo_description = payload.seo_description || slides.find((s) => s.seo_description)?.seo_description || existingStory?.seo_description || null
      }
    }

    const resolvedSlug = updates.slug || existingStory?.slug || ''
    updates.canonical_url = resolveCanonicalUrl(payload.canonical_url || updates.canonical_url || existingStory?.canonical_url, buildStoryPath(resolvedSlug))
    if (!updates.seo_title) {
      updates.seo_title = payload.seo_title || existingStory?.seo_title || updates.title || existingStory?.title || null
    }

    const validation = validateWebStoryPayload({
      title: updates.title || existingStory?.title || '',
      coverImage: updates.cover_image || existingStory?.cover_image || '',
      coverImageAlt: updates.cover_image_alt || existingStory?.cover_image_alt || updates.title || existingStory?.title || '',
      slides: updates.slides || existingStory?.slides || [],
      seoTitle: updates.seo_title || existingStory?.seo_title || '',
      seoDescription: updates.seo_description || existingStory?.seo_description || '',
      canonicalUrl: updates.canonical_url,
      structuredData: updates.structured_data || existingStory?.structured_data || null,
      publishedAt: updates.published_at || existingStory?.published_at || null,
      updatedAt: updates.updated_at,
      status: updates.status,
    })
    if (!validation.valid) {
      console.warn('Web story update validation failed', {
        storyId: params.id,
        status: updates.status,
        issues: validation.issues,
      })
      return apiResponse(422, null, {
        message: validation.issues[0],
        issues: validation.issues,
      })
    }

    const { data, error } = await supabase
      .from('web_stories')
      .update(updates)
      .eq('id', params.id)
      .select(STORY_SELECT)
      .single()
    if (error) return apiResponse(500, null, error.message)

    let syncedTags = []
    if (incomingTagIds !== null) {
      syncedTags = await syncStoryTags(supabase, params.id, incomingTagIds)
    }

    revalidateStorySurface(existingStory)
    revalidateStorySurface(data)
    revalidateTagSurfaces(existingStoryTags.map((entry) => entry?.tags).filter(Boolean))
    revalidateTagSurfaces(syncedTags)
    return apiResponse(200, { story: data })
  } catch (error) {
    if (error.name === 'AuthError') return apiResponse(401, null, error.message)
    console.error(error)
    return apiResponse(500, null, 'An internal error occurred')
  }
}

export async function DELETE(_request, { params }) {
  try {
    const user = await requireAuth()
    const supabase = createAdminClient()
    const allowed = await canMutateStory(supabase, params.id, user)
    if (!allowed) return apiResponse(403, null, 'Forbidden')

    const { data: existingStory } = await supabase
      .from('web_stories')
      .select('slug')
      .eq('id', params.id)
      .maybeSingle()

    const { error } = await supabase.from('web_stories').delete().eq('id', params.id)
    if (error) return apiResponse(500, null, error.message)

    revalidateStorySurface(existingStory)
    return apiResponse(200, { ok: true })
  } catch (error) {
    if (error.name === 'AuthError') return apiResponse(401, null, error.message)
    console.error(error)
    return apiResponse(500, null, 'An internal error occurred')
  }
}






