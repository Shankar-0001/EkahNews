import deploymentPolicy from './deployment-policy.cjs'
import { navigationMutationOriginAllowed } from './navigation-model.mjs'
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

export function isSameOriginMutation(request) {
  try {
    const deployment = deploymentPolicy.getPublicDeployment()
    return navigationMutationOriginAllowed(getRequestOrigin(request), deployment.origin)
  } catch { return false }
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
