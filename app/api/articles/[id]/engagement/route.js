import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { apiResponse } from '@/lib/api-utils'
import { checkRateLimit, getClientIp, isSameOriginMutation } from '@/lib/request-guards'

const sanitizeNumber = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0)
const COOKIE_TTL_SECONDS = 60 * 60 * 12
const RATE_LIMITS = {
  view: { limit: 30, windowMs: 60_000 },
  like: { limit: 12, windowMs: 60_000 },
  share: { limit: 12, windowMs: 60_000 },
}

async function getCurrentMetrics(supabase, articleId) {
  const { data } = await supabase
    .from('article_engagement')
    .select('views, likes, shares')
    .eq('article_id', articleId)
    .maybeSingle()

  return {
    views: sanitizeNumber(data?.views),
    likes: sanitizeNumber(data?.likes),
    shares: sanitizeNumber(data?.shares),
  }
}

export async function GET(_request, { params }) {
  try {
    const supabase = await createClient()
    const articleId = params?.id
    if (!articleId) return apiResponse(400, null, 'Article ID is required')

    const metrics = await getCurrentMetrics(supabase, articleId)
    return apiResponse(200, { metrics }, null)
  } catch (error) {
    console.error(error)
    return apiResponse(500, null, 'An internal error occurred')
  }
}

export async function POST(request, { params }) {
  try {
    if (!isSameOriginMutation(request)) {
      return apiResponse(403, null, 'Cross-origin requests are not allowed')
    }

    const articleId = params?.id
    if (!articleId) return apiResponse(400, null, 'Article ID is required')

    const { action } = await request.json()
    if (!['view', 'like', 'share'].includes(action)) {
      return apiResponse(400, null, 'Invalid action')
    }

    const rateResult = checkRateLimit({
      key: `${getClientIp(request)}:article:${action}:${articleId}`,
      ...RATE_LIMITS[action],
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
    const cookieName = `engagement:article:${action}:${articleId}`
    const supabase = await createClient()

    if (cookieStore.get(cookieName)?.value === '1') {
      const metrics = await getCurrentMetrics(supabase, articleId)
      return apiResponse(200, { metrics, deduped: true }, null)
    }

    const current = await getCurrentMetrics(supabase, articleId)
    const next = {
      views: current.views + (action === 'view' ? 1 : 0),
      likes: current.likes + (action === 'like' ? 1 : 0),
      shares: current.shares + (action === 'share' ? 1 : 0),
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from('article_engagement')
      .upsert(
        {
          article_id: articleId,
          ...next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'article_id' }
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
