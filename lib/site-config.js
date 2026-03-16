export const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://ekahnews.com'

export function absoluteUrl(path = '/') {
  if (!path.startsWith('/')) return `${SITE_URL}/${path}`
  return `${SITE_URL}${path}`
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

