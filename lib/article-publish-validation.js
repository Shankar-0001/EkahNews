import { ValidationError } from '@/lib/validation'

const PUBLISH_READY_STATUSES = new Set(['pending', 'published'])

function countWordsInHtml(html) {
  const text = String(html || '')
    .replace(/<[^>]+>/g, ' ')
  return text.trim()
    .split(/\s+/)
    .filter(Boolean).length
}

export async function validateArticlePublishReadiness(admin, articleData = {}) {
  if (!PUBLISH_READY_STATUSES.has(articleData.status)) {
    return
  }

  const errors = {}

  if (!articleData.title?.trim()) {
    errors.title = 'Title is required before submission'
  }

  if (!articleData.category_id) {
    errors.category_id = 'Category is required before submission'
  }

  if (!articleData.excerpt?.trim()) {
    errors.excerpt = 'Excerpt is required before submission'
  }

  if (!articleData.seo_title?.trim()) {
    errors.seo_title = 'SEO title is required before submission'
  }

  if (!articleData.seo_description?.trim()) {
    errors.seo_description = 'SEO description is required before submission'
  }

  if (!articleData.featured_image_url?.trim()) {
    errors.featured_image_url = 'Featured image is required before submission'
  }

  if (articleData.featured_image_url && !articleData.featured_image_alt?.trim()) {
    errors.featured_image_alt = 'Featured image alt text is required before submission'
  }

  if (articleData.featured_image_url) {
    const { data: media } = await admin
      .from('media_library')
      .select('original_width, original_height')
      .eq('file_url', articleData.featured_image_url)
      .maybeSingle()

    if (!media) {
      errors.featured_image_url = 'Featured image must be uploaded through the media library before submission'
    } else {
      if (media.original_width && media.original_width < 1200) {
        errors.featured_image_url = 'Featured image must be at least 1200px wide before submission'
      }
      if (media.original_height && media.original_height < 630) {
        errors.featured_image_url = 'Featured image must be at least 1200x630 before submission'
      }
    }
  }

  if (articleData.status === 'published') {
    const wordCount = countWordsInHtml(articleData.content)
    if (wordCount < 300) {
      const message = `Article must be at least 300 words to publish. Current count: ${wordCount} words.`
      throw new ValidationError(message, {
        content: message,
      })
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Article publish readiness failed', errors)
  }
}
