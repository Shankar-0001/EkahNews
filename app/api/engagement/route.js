import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { apiResponse } from '@/lib/api-utils'
import { checkRateLimit, getClientIp, isSameOriginMutation } from '@/lib/request-guards'

const toNumber = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const COOKIE_TTL_SECONDS = 60 * 60 * 12
const ALLOWED_TYPES = new Set(['article', 'story'])
const RATE_LIMITS = {
  view: { limit: 30, windowMs: 60_000 },
  like: { limit: 12, windowMs: 60_000 },
  share: { limit: 12, windowMs: 60_000 },
}

async function getMetrics(supabase, articleId) {
  const { data } = await supabase
    .from('article_engagement')
    .select('views, likes, shares')
    .eq('article_id', articleId)
    .maybeSingle()

  return {
    views: toNumber(data?.views),
    likes: toNumber(data?.likes),
    shares: toNumber(data?.shares),
  }
}

async function getStoryMetrics(supabase, storyId) {
  const { data } = await supabase
    .from('web_story_engagement')
    .select('views, likes, shares')
    .eq('story_id', storyId)
    .maybeSingle()

  return {
    views: toNumber(data?.views),
    likes: toNumber(data?.likes),
    shares: toNumber(data?.shares),
  }
}

export async function GET(request) {
  try {
    const search = new URL(request.url).searchParams
    const entityId = search.get('id')
    const type = search.get('type') || 'article'
    if (!entityId) return apiResponse(400, null, 'id is required')
    if (!ALLOWED_TYPES.has(type)) return apiResponse(400, null, 'Invalid type')

    const supabase = await createClient()
    const metrics = type === 'story'
      ? await getStoryMetrics(supabase, entityId)
      : await getMetrics(supabase, entityId)
    return apiResponse(200, { metrics }, null)
  } catch (error) {
    console.error(error)
    return apiResponse(500, null, 'An internal error occurred')
  }
}

export async function POST(request) {
  try {
    if (!isSameOriginMutation(request)) {
      return apiResponse(403, null, 'Cross-origin requests are not allowed')
    }

    const body = await request.json()
    const entityId = body.id
    const action = body.action
    const type = body.type || 'article'

    if (!entityId) return apiResponse(400, null, 'id is required')
    if (!ALLOWED_TYPES.has(type)) return apiResponse(400, null, 'Invalid type')
    if (!['view', 'like', 'share'].includes(action)) {
      return apiResponse(400, null, 'Invalid action')
    }

    const rateConfig = RATE_LIMITS[action]
    const rateResult = checkRateLimit({
      key: `${getClientIp(request)}:${type}:${action}:${entityId}`,
      ...rateConfig,
    })

    if (!rateResult.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          status: 429,
          error: 'Too many engagement requests. Please try again shortly.',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.max(1, Math.ceil((rateResult.resetAt - Date.now()) / 1000))),
          },
        }
      )
    }

    const cookieStore = cookies()
    const cookieName = `engagement:${type}:${action}:${entityId}`
    const supabase = await createClient()

    if (cookieStore.get(cookieName)?.value === '1') {
      const metrics = type === 'story'
        ? await getStoryMetrics(supabase, entityId)
        : await getMetrics(supabase, entityId)
      return apiResponse(200, { metrics, deduped: true }, null)
    }

    const current = type === 'story'
      ? await getStoryMetrics(supabase, entityId)
      : await getMetrics(supabase, entityId)
    const next = {
      views: current.views + (action === 'view' ? 1 : 0),
      likes: current.likes + (action === 'like' ? 1 : 0),
      shares: current.shares + (action === 'share' ? 1 : 0),
    }

    const table = type === 'story' ? 'web_story_engagement' : 'article_engagement'
    const idField = type === 'story' ? 'story_id' : 'article_id'
    const admin = createAdminClient()
    const { error } = await admin
      .from(table)
      .upsert(
        {
          [idField]: entityId,
          ...next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: idField }
      )

    if (error) return apiResponse(500, null, error.message)

    cookieStore.set(cookieName, '1', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_TTL_SECONDS,
      path: '/',
    })

    return apiResponse(200, { metrics: next }, null)
  } catch (error) {
    console.error(error)
    return apiResponse(500, null, 'An internal error occurred')
  }
}
