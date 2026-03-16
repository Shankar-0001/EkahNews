import { SITE_URL } from '@/lib/site-config'

function normalizeBaseOrigin(baseUrl = SITE_URL) {
  try {
    return new URL(baseUrl).origin
  } catch {
    return 'https://ekahnews.com'
  }
}

function isInternalHref(href = '', baseOrigin = normalizeBaseOrigin()) {
  if (!href) return true
  const value = href.trim().toLowerCase()
  if (
    value.startsWith('/') ||
    value.startsWith('#') ||
    value.startsWith('mailto:') ||
    value.startsWith('tel:') ||
    value.startsWith('javascript:')
  ) {
    return true
  }

  try {
    return new URL(href, baseOrigin).origin === baseOrigin
  } catch {
    return true
  }
}

function stripAttr(attrs = '', attrName = '') {
  const pattern = new RegExp(`\\s${attrName}\\s*=\\s*(".*?"|'.*?'|[^\\s>]+)`, 'gi')
  return attrs.replace(pattern, '')
}

export function getLinkRelForHref(href, options = {}) {
  const { baseUrl = SITE_URL, nofollowExternal = true } = options
  const internal = isInternalHref(href, normalizeBaseOrigin(baseUrl))

  if (internal) {
    return 'follow'
  }

  return nofollowExternal ? 'nofollow noopener noreferrer' : 'noopener noreferrer'
}

export function getAnchorPropsForHref(href, options = {}) {
  const { baseUrl = SITE_URL, nofollowExternal = true } = options
  const internal = isInternalHref(href, normalizeBaseOrigin(baseUrl))

  if (internal) {
    return { rel: 'follow' }
  }

  return {
    target: '_blank',
    rel: nofollowExternal ? 'nofollow noopener noreferrer' : 'noopener noreferrer',
  }
}

export function applyLinkPolicyToHtml(html = '', options = {}) {
  if (!html || typeof html !== 'string') return html
  const { baseUrl = SITE_URL, nofollowExternal = true } = options
  const baseOrigin = normalizeBaseOrigin(baseUrl)

  return html.replace(/<a\b([^>]*?)>/gi, (fullMatch, attrChunk = '') => {
    const hrefMatch = attrChunk.match(/\shref\s*=\s*(".*?"|'.*?'|[^\s>]+)/i)
    if (!hrefMatch) return fullMatch

    const hrefRaw = hrefMatch[1]
    const href = hrefRaw.replace(/^['"]|['"]$/g, '')
    const internal = isInternalHref(href, baseOrigin)
    const rel = internal ? 'follow' : (nofollowExternal ? 'nofollow noopener noreferrer' : 'noopener noreferrer')

    let updatedAttrs = stripAttr(attrChunk, 'rel')
    updatedAttrs = stripAttr(updatedAttrs, 'target')
    updatedAttrs = `${updatedAttrs} rel="${rel}"`
    if (!internal) {
      updatedAttrs = `${updatedAttrs} target="_blank"`
    }

    return `<a${updatedAttrs}>`
  })
}


