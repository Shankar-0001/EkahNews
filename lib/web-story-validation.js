import { SITE_URL } from '@/lib/site-config'

function isHttpUrl(value = '') {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function validateCanonicalUrl(canonicalUrl = '') {
  if (!canonicalUrl) return null

  try {
    const siteUrl = SITE_URL
    const parsed = new URL(canonicalUrl, siteUrl)
    const siteOrigin = new URL(siteUrl).origin
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== siteOrigin) {
      return 'Canonical URL must use the production site domain.'
    }
  } catch {
    return 'Canonical URL must be a valid absolute or site-relative URL.'
  }

  return null
}


function validateStructuredData(value) {
  if (!value) return null

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return 'Structured data override must be a valid JSON object.'
    }
  } catch {
    return 'Structured data override must be valid JSON.'
  }

  return null
}

function validateCtaUrl(value = '') {
  if (!value) return null
  return isHttpUrl(value) ? null : 'CTA URL must be a valid absolute URL.'
}

function validateWhatsappUrl(value = '') {
  if (!value) return null
  if (!isHttpUrl(value)) {
    return 'WhatsApp URL must be a valid absolute URL.'
  }

  try {
    const hostname = new URL(value).hostname.toLowerCase()
    if (!hostname.includes('whatsapp.com') && !hostname.includes('wa.me')) {
      return 'WhatsApp URL must use whatsapp.com or wa.me.'
    }
  } catch {
    return 'WhatsApp URL must be a valid absolute URL.'
  }

  return null
}

function isValidVideoDuration(value) {
  return Number.isFinite(value) && value > 0
}

export function validateWebStoryPayload({
  title = '',
  coverImage = '',
  coverImageAlt = '',
  slides = [],
  seoTitle = '',
  seoDescription = '',
  canonicalUrl = '',
  structuredData = null,
  publishedAt = null,
  updatedAt = null,
  status = 'draft',
} = {}) {
  const issues = []

  if (!title || title.trim().length < 8) {
    issues.push('Title should be at least 8 characters.')
  }

  if (!Array.isArray(slides) || slides.length < 1) {
    issues.push('Web Story should include at least 1 slide.')
  }

  if (!coverImage || !isHttpUrl(coverImage)) {
    issues.push('Cover image must be a valid absolute URL.')
  }

  if (coverImage && !coverImageAlt.trim()) {
    issues.push('Cover image alt text is required.')
  }

  if (coverImageAlt && coverImageAlt.trim().length > 160) {
    issues.push('Cover image alt text should be 160 characters or less.')
  }

  if (seoTitle && seoTitle.trim().length > 110) {
    issues.push('SEO title should be 110 characters or less.')
  }

  if (seoDescription && seoDescription.trim().length > 200) {
    issues.push('SEO description should be 200 characters or less.')
  }

  const canonicalIssue = validateCanonicalUrl(canonicalUrl)
  if (canonicalIssue) {
    issues.push(canonicalIssue)
  }

  const structuredDataIssue = validateStructuredData(structuredData)
  if (structuredDataIssue) {
    issues.push(structuredDataIssue)
  }

  if (publishedAt && Number.isNaN(new Date(publishedAt).getTime())) {
    issues.push('Publish date must be a valid date-time.')
  }

  if (updatedAt && Number.isNaN(new Date(updatedAt).getTime())) {
    issues.push('Updated date must be a valid date-time.')
  }

  if (!['draft', 'pending', 'published', 'archived'].includes(status)) {
    issues.push('Status must be draft, pending, published, or archived.')
  }

  if (status === 'published' && !seoDescription.trim()) {
    issues.push('Published web stories should include an SEO description.')
  }

  if (Array.isArray(slides)) {
    slides.forEach((slide, index) => {
      const isVideoSlide = slide?.media_type === 'video'

      if (isVideoSlide) {
        if (!slide?.video || !isHttpUrl(slide.video)) {
          issues.push(`Slide ${index + 1}: video must be a valid absolute URL.`)
        }
        const duration = Number(slide?.video_duration)
        if (!isValidVideoDuration(duration)) {
          issues.push(`Slide ${index + 1}: video duration is required.`)
        } else if (duration > 30) {
          issues.push(`Slide ${index + 1}: video must be 30 seconds or less.`)
        }
      } else if (!slide?.image || !isHttpUrl(slide.image)) {
        issues.push(`Slide ${index + 1}: image must be a valid absolute URL.`)
      }
      const headlineLength = (slide?.headline || title || '').trim().length
      if (headlineLength < 5 || headlineLength > 90) {
        issues.push(`Slide ${index + 1}: headline should be between 5 and 90 characters.`)
      }
      const descriptionLength = (slide?.description || '').trim().length
      if (descriptionLength === 0) {
        issues.push(`Slide ${index + 1}: description is required.`)
      } else if (descriptionLength > 220) {
        issues.push(`Slide ${index + 1}: description should be 220 characters or less.`)
      }
      const altLength = (slide?.image_alt || '').trim().length
      if (altLength === 0) {
        issues.push(`Slide ${index + 1}: media alt text is required.`)
      } else if (altLength > 160) {
        issues.push(`Slide ${index + 1}: media alt text should be 160 characters or less.`)
      }

      if (slide?.image && !isHttpUrl(slide.image)) {
        issues.push(`Slide ${index + 1}: poster image must be a valid absolute URL.`)
      }

      const ctaIssue = validateCtaUrl(slide?.cta_url || '')
      if (ctaIssue) {
        issues.push(`Slide ${index + 1}: ${ctaIssue}`)
      }

      const whatsappIssue = validateWhatsappUrl(slide?.whatsapp_group_url || '')
      if (whatsappIssue) {
        issues.push(`Slide ${index + 1}: ${whatsappIssue}`)
      }
    })
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

