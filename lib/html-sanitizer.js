import { parse, NodeType } from 'next/dist/compiled/node-html-parser'

const BLOCKED_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'option',
  'meta',
  'base',
  'link',
])

const GLOBAL_ATTRS = new Set([
  'class',
  'id',
  'title',
  'lang',
  'dir',
  'role',
  'aria-label',
  'aria-hidden',
  'aria-describedby',
  'aria-labelledby',
])

const TAG_ATTRS = {
  a: new Set(['href', 'name', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height', 'loading', 'decoding']),
  source: new Set(['src', 'srcset', 'type', 'media']),
  video: new Set(['src', 'controls', 'poster', 'preload', 'muted', 'playsinline']),
  audio: new Set(['src', 'controls', 'preload']),
  table: new Set(['summary']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan', 'scope']),
}

function isSafeUrl(value = '', { allowRelative = false } = {}) {
  if (!value) return false
  const trimmed = value.trim()
  if (allowRelative && (trimmed.startsWith('/') || trimmed.startsWith('#'))) {
    return true
  }

  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:' || parsed.protocol === 'tel:'
  } catch {
    return false
  }
}

function sanitizeAttribute(node, attrName, attrValue) {
  const tag = (node.tagName || '').toLowerCase()
  const name = String(attrName || '').toLowerCase()
  const value = String(attrValue || '')

  if (name.startsWith('on')) return null
  if (!(GLOBAL_ATTRS.has(name) || TAG_ATTRS[tag]?.has(name))) return null

  if (name === 'href') {
    return isSafeUrl(value, { allowRelative: true }) ? value.trim() : '#'
  }

  if (name === 'src') {
    return isSafeUrl(value, { allowRelative: false }) ? value.trim() : null
  }

  if (name === 'srcset') {
    const entries = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((entry) => {
        const [urlPart] = entry.split(/\s+/, 1)
        return isSafeUrl(urlPart, { allowRelative: false })
      })
    return entries.length > 0 ? entries.join(', ') : null
  }

  if (name === 'target') {
    return value === '_blank' ? '_blank' : null
  }

  if (name === 'rel') {
    return value
      .split(/\s+/)
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean)
      .filter((token) => ['nofollow', 'noopener', 'noreferrer', 'ugc', 'sponsored'].includes(token))
      .join(' ') || null
  }

  return value
}

function sanitizeNode(node) {
  if (!node) return

  if (node.nodeType === NodeType.ELEMENT_NODE) {
    const tag = (node.tagName || '').toLowerCase()

    if (BLOCKED_TAGS.has(tag)) {
      node.remove()
      return
    }

    const attributes = { ...(node.attributes || {}) }
    Object.entries(attributes).forEach(([attrName, attrValue]) => {
      const sanitizedValue = sanitizeAttribute(node, attrName, attrValue)
      if (sanitizedValue == null || sanitizedValue === '') {
        node.removeAttribute(attrName)
      } else {
        node.setAttribute(attrName, sanitizedValue)
      }
    })

    if (tag === 'a' && !node.getAttribute('href')) {
      node.removeAttribute('target')
      node.removeAttribute('rel')
    }

    if (tag === 'img' && !node.getAttribute('src')) {
      node.remove()
      return
    }

    if (tag === 'img') {
      if (!node.getAttribute('loading')) {
        node.setAttribute('loading', 'lazy')
      }
      if (!node.getAttribute('decoding')) {
        node.setAttribute('decoding', 'async')
      }
    }
  }

  ;[...(node.childNodes || [])].forEach((child) => sanitizeNode(child))
}

function fallbackSanitizeHtml(html = '') {
  let clean = String(html || '')

  BLOCKED_TAGS.forEach((tag) => {
    const regex = new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>|<${tag}[^>]*\\/?>`, 'gi')
    clean = clean.replace(regex, '')
  })

  clean = clean
    .replace(/\son[a-z-]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
    .replace(/\shref\s*=\s*["']\s*javascript:[^"']*["']/gi, ' href="#"')
    .replace(/\ssrc\s*=\s*["']\s*javascript:[^"']*["']/gi, '')
    .replace(/\sstyle\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')

  return clean.trim()
}

export function sanitizeStoredHtml(html = '') {
  if (!html || typeof html !== 'string') return ''

  try {
    const root = parse(html, {
      comment: false,
      blockTextElements: {
        script: false,
        noscript: false,
        style: false,
        pre: true,
      },
    })

    ;[...(root.childNodes || [])].forEach((node) => sanitizeNode(node))
    return root.toString().trim()
  } catch {
    return fallbackSanitizeHtml(html)
  }
}
