/**
 * Content processing helpers for SEO/UX.
 */

export function stripHtml(html = '') {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeAbbreviations(text = '') {
  return text
    .replace(/\b([ap])\.m\./gi, '$1m')
    .replace(/\b([ap])\.m\b/gi, '$1m')
    .replace(/\bU\.S\./gi, 'US')
    .replace(/\bU\.K\./gi, 'UK')
    .replace(/\bE\.U\./gi, 'EU')
    .replace(/\bMr\./gi, 'Mr')
    .replace(/\bMrs\./gi, 'Mrs')
    .replace(/\bMs\./gi, 'Ms')
    .replace(/\bDr\./gi, 'Dr')
    .replace(/\bSt\./gi, 'St')
    .replace(/\bInc\./gi, 'Inc')
    .replace(/\bLtd\./gi, 'Ltd')
    .replace(/\bJr\./gi, 'Jr')
    .replace(/\bSr\./gi, 'Sr')
    .replace(/\bNo\./gi, 'No')
    .replace(/\bvs\./gi, 'vs')
    .replace(/\betc\./gi, 'etc')
}

function ensureSentence(text = '') {
  const trimmed = text.trim()
  if (!trimmed) return ''
  if (/[.!?]$/.test(trimmed)) return trimmed
  return `${trimmed}.`
}

function normalizeForCompare(text = '') {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function splitSentences(text = '') {
  const cleaned = normalizeAbbreviations(text).replace(/\s+/g, ' ').trim()
  if (!cleaned) return []

  const matches = cleaned.match(/[^.!?]+[.!?]+/g) || []
  const remainder = cleaned.replace(/[^.!?]+[.!?]+/g, '').trim()
  const raw = remainder ? [...matches, remainder] : matches

  return raw
    .map((s) => ensureSentence(s))
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length >= 20 || s.split(/\s+/).length >= 4)
}

function uniqueSentences(sentences = []) {
  const seen = new Set()
  const unique = []
  for (const sentence of sentences) {
    const key = normalizeForCompare(sentence)
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(sentence)
  }
  return unique
}

export function calculateReadingTime(content = '') {
  const text = stripHtml(content)
  const words = text ? text.split(/\s+/).length : 0
  const minutes = Math.max(1, Math.ceil(words / 220))
  return minutes
}

export function generateSixtySecondSummary(article = {}) {
  const text = stripHtml(article.content || '')
  const sentences = splitSentences(text)
  const seen = new Set()

  const summary = []
  const excerpt = article.excerpt?.trim()
  if (excerpt) {
    const normalized = normalizeForCompare(excerpt)
    if (normalized) {
      seen.add(normalized)
      summary.push(ensureSentence(excerpt))
    }
  }

  for (const sentence of sentences) {
    const key = normalizeForCompare(sentence)
    if (key && !seen.has(key)) {
      seen.add(key)
      summary.push(sentence)
    }
    if (summary.length >= 4) break
  }
  const unique = uniqueSentences(summary).slice(0, 5)
  if (unique.length > 0) return unique

  const fallback = article.title?.trim()
  return [ensureSentence(fallback || 'Key updates from this story in under a minute')]
}

export function generateAeoSnapshot(article = {}) {
  const text = stripHtml(article.content || '')
  const sentences = splitSentences(text)

  const whatChanged = ensureSentence(
    sentences[0] || article.excerpt || article.title || 'Latest developments in this story'
  )
  const whyItMatters = ensureSentence(
    sentences[1]
    || article.excerpt
    || 'This update can affect policy, markets, or daily life depending on context'
  )
  const keyContext = ensureSentence(
    sentences[2] || `Coverage topic: ${article.categories?.name || 'General News'}`
  )

  return {
    whatChanged,
    whyItMatters,
    keyContext,
  }
}

