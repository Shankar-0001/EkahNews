export function getRequestOrigin(request) {
  const origin = request.headers.get('origin')
  if (origin) return origin

  const referer = request.headers.get('referer')
  if (!referer) return ''

  try {
    return new URL(referer).origin
  } catch {
    return ''
  }
}

function normalizeOriginForComparison(origin = '') {
  if (!origin) return ''

  try {
    const parsed = new URL(origin)
    const hostname = parsed.hostname
    const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0'

    if (isLoopback) {
      return `${parsed.protocol}//localhost:${parsed.port || (parsed.protocol === 'https:' ? '443' : '80')}`
    }

    return parsed.origin
  } catch {
    return ''
  }
}

export function isSameOriginMutation(request) {
  const requestOrigin = getRequestOrigin(request)
  if (!requestOrigin) return true

  try {
    const urlOrigin = new URL(request.url).origin
    const siteOrigin = process.env.NEXT_PUBLIC_BASE_URL
      ? new URL(process.env.NEXT_PUBLIC_BASE_URL).origin
      : urlOrigin

    const normalizedRequestOrigin = normalizeOriginForComparison(requestOrigin)
    const normalizedUrlOrigin = normalizeOriginForComparison(urlOrigin)
    const normalizedSiteOrigin = normalizeOriginForComparison(siteOrigin)

    return normalizedRequestOrigin === normalizedUrlOrigin || normalizedRequestOrigin === normalizedSiteOrigin
  } catch {
    return false
  }
}

export function getClientIp(request) {
  const forwardedFor = request.headers.get('x-forwarded-for') || ''
  const realIp = request.headers.get('x-real-ip') || ''
  return forwardedFor.split(',')[0].trim() || realIp.trim() || 'unknown'
}

function getStore() {
  if (!globalThis.__requestRateLimitStore) {
    globalThis.__requestRateLimitStore = new Map()
  }

  return globalThis.__requestRateLimitStore
}

export function checkRateLimit({ key, limit = 30, windowMs = 60_000 }) {
  const store = getStore()
  const now = Date.now()
  const current = store.get(key)

  if (!current || current.resetAt <= now) {
    const nextEntry = { count: 1, resetAt: now + windowMs }
    store.set(key, nextEntry)
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt: nextEntry.resetAt }
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt }
  }

  current.count += 1
  store.set(key, current)
  return { allowed: true, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt }
}
