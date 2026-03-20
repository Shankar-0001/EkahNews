import { slugFromText } from '@/lib/site-config'
import { stripHtml } from '@/lib/content-utils'

const MAX_KEYWORDS = 4

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'has', 'was', 'were',
  'will', 'into', 'about', 'your', 'their', 'them', 'they', 'are', 'you', 'our',
  'but', 'not', 'out', 'all', 'his', 'her', 'she', 'him', 'its', 'who', 'what',
  'when', 'where', 'how', 'why', 'can', 'could', 'should', 'would', 'than', 'then',
  'new', 'latest', 'news', 'update', 'updates', 'says', 'after', 'before', 'over',
  'under', 'more', 'most', 'amid', 'into', 'onto', 'near',
])

const GENERIC_TOPIC_BLACKLIST = new Set([
  'news',
  'latest news',
  'world news',
  'latest',
  'breaking news',
])

function normalizeText(text = '') {
  return stripHtml(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(text = '') {
  return normalizeText(text)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token))
}

function isValidPhrase(tokens = []) {
  if (!tokens.length || tokens.length > 4) return false
  if (tokens.some((token) => !token || token.length < 3 || STOPWORDS.has(token))) return false
  return true
}

function phraseScore(tokens = [], sourceWeight = 1) {
  const joined = tokens.join(' ')
  const uniqueCount = new Set(tokens).size
  const phraseBonus = tokens.length > 1 ? 6 : 0
  const diversityBonus = uniqueCount === tokens.length ? 2 : 0
  const lengthPenalty = tokens.length === 1 ? 3 : 0
  return sourceWeight + phraseBonus + diversityBonus - lengthPenalty + joined.length / 100
}

function collectPhraseScores(text = '', sourceWeight = 1, scores = new Map()) {
  const tokens = tokenize(text)
  if (tokens.length === 0) return scores

  for (let size = 4; size >= 2; size -= 1) {
    for (let i = 0; i <= tokens.length - size; i += 1) {
      const phraseTokens = tokens.slice(i, i + size)
      if (!isValidPhrase(phraseTokens)) continue

      const phrase = phraseTokens.join(' ')
      if (GENERIC_TOPIC_BLACKLIST.has(phrase)) continue
      scores.set(phrase, (scores.get(phrase) || 0) + phraseScore(phraseTokens, sourceWeight))
    }
  }

  for (const token of tokens) {
    if (GENERIC_TOPIC_BLACKLIST.has(token)) continue
    scores.set(token, (scores.get(token) || 0) + phraseScore([token], sourceWeight / 2))
  }

  return scores
}

function normalizeKeyword(value = '') {
  return value
    .toString()
    .trim()
    .replace(/\s+/g, ' ')
}

function dedupeKeywords(keywords = []) {
  const seen = new Set()
  return keywords.filter((keyword) => {
    const normalized = keyword.toLowerCase()
    if (!normalized || seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })
}

export function extractKeywordsFromText(text = '', limit = MAX_KEYWORDS) {
  const scores = collectPhraseScores(text, 1)

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([keyword]) => keyword)
    .slice(0, Math.min(limit, MAX_KEYWORDS))
}

export function buildArticleKeywords(article = {}, limit = MAX_KEYWORDS) {
  const manual = (article.article_tags || article.tags || [])
    .map((item) => item?.tags?.name || item?.name || '')
    .map(normalizeKeyword)
    .filter((name) => name && !GENERIC_TOPIC_BLACKLIST.has(name.toLowerCase()))

  const scores = new Map()

  manual.forEach((keyword, index) => {
    scores.set(keyword.toLowerCase(), {
      keyword,
      score: 100 - index,
    })
  })

  ;[
    { text: article.title, weight: 12 },
    { text: article.excerpt, weight: 8 },
    { text: article.content, weight: 3 },
  ].forEach(({ text, weight }) => {
    const localScores = collectPhraseScores(text, weight)
    for (const [keyword, score] of localScores.entries()) {
      const normalized = keyword.toLowerCase()
      const existing = scores.get(normalized)
      const nextScore = (existing?.score || 0) + score
      scores.set(normalized, {
        keyword: existing?.keyword || keyword,
        score: nextScore,
      })
    }
  })

  return dedupeKeywords(
    [...scores.values()]
      .sort((a, b) => b.score - a.score || b.keyword.length - a.keyword.length)
      .map((item) => item.keyword)
  ).slice(0, Math.min(limit, MAX_KEYWORDS))
}

export function keywordsToMetadataValue(keywords = []) {
  return (keywords || [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_KEYWORDS)
    .join(', ')
}

export function keywordsToTopicLinks(keywords = [], limit = MAX_KEYWORDS) {
  return (keywords || [])
    .slice(0, Math.min(limit, MAX_KEYWORDS))
    .map((keyword) => ({
      keyword,
      slug: slugFromText(keyword),
    }))
    .filter((item) => {
      if (!item.slug) return false
      const normalized = item.keyword.toLowerCase().trim()
      if (GENERIC_TOPIC_BLACKLIST.has(normalized)) return false
      return true
    })
}
