const DEFAULT_SITE_URL = 'https://www.ekahnews.com'

function withPreferredHostname(url) {
  const normalized = new URL(url)

  if (normalized.hostname === 'ekahnews.com') {
    normalized.hostname = 'www.ekahnews.com'
  }

  return normalized.origin
}

export function normalizeSiteUrl(url = DEFAULT_SITE_URL) {
  try {
    return withPreferredHostname(url)
  } catch {
    return DEFAULT_SITE_URL
  }
}

export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_SITE_URL)
export const PUBLICATION_LOGO_PATH = '/logo.png'

export function absoluteUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalizedPath}`
}

export function resolveCanonicalUrl(candidate = '', fallbackPath = '/') {
  const siteOrigin = SITE_URL

  if (!candidate) {
    return absoluteUrl(fallbackPath)
  }

  try {
    const parsed = new URL(candidate, siteOrigin)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return absoluteUrl(fallbackPath)
    }
    if (normalizeSiteUrl(parsed.origin) !== siteOrigin) {
      return absoluteUrl(fallbackPath)
    }
    return `${normalizeSiteUrl(parsed.origin)}${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return absoluteUrl(fallbackPath)
  }
}

export function getArticlePath(article = {}) {
  return `/${article.categories?.slug || article.category_slug || 'news'}/${article.slug || ''}`.replace(/\/+$/, '')
}

export function getArticleCanonicalUrl(article = {}) {
  return resolveCanonicalUrl(article.canonical_url, getArticlePath(article) || '/')
}

export function getPublicationLogoUrl() {
  return absoluteUrl(PUBLICATION_LOGO_PATH)
}

export function getPublicationSocialProfiles() {
  return [
    process.env.NEXT_PUBLIC_FACEBOOK_URL,
    process.env.NEXT_PUBLIC_TWITTER_URL,
    process.env.NEXT_PUBLIC_INSTAGRAM_URL,
    process.env.NEXT_PUBLIC_YOUTUBE_URL,
    process.env.NEXT_PUBLIC_LINKEDIN_URL,
  ].filter(Boolean)
}

export function getPublicationContactInfo() {
  return {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || '',
    editorialEmail: process.env.NEXT_PUBLIC_EDITORIAL_EMAIL || process.env.NEXT_PUBLIC_CONTACT_EMAIL || '',
    correctionsEmail: process.env.NEXT_PUBLIC_CORRECTIONS_EMAIL || process.env.NEXT_PUBLIC_CONTACT_EMAIL || '',
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE || '',
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_TIPLINE || '',
    address: process.env.NEXT_PUBLIC_CONTACT_ADDRESS || '',
  }
}

export function buildLanguageAlternates(path = '/') {
  const url = absoluteUrl(path)
  return {
    'en-US': url,
    'en-IN': url,
    'x-default': url,
  }
}

export function slugFromText(value = '') {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
