import { apiResponse } from '@/lib/api-utils'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchTrendingQueries } from '@/lib/trends-fetcher'
import { processTrendAlerts } from '@/lib/trend-alerts'

function isAuthorized(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const authHeader = request.headers.get('authorization') || ''
  return authHeader === `Bearer ${secret}`
}

export async function GET(request) {
  try {
    if (!isAuthorized(request)) {
      return apiResponse(401, null, 'Unauthorized cron request')
    }

    const trends = await fetchTrendingQueries()
    if (!trends.length) {
      return apiResponse(200, { inserted: 0, updated: 0, total: 0, source: 'google-trends-rss-empty' }, null)
    }

    const admin = createAdminClient()
    const now = new Date().toISOString()
    const payload = trends.map((item) => ({
      keyword: item.keyword,
      slug: item.slug,
      search_volume: Math.max(0, item.search_volume || 0),
      created_at: item.created_at || now,

      updated_at: now,
    }))

    const { error } = await admin
      .from('trending_topics')
      .upsert(payload, { onConflict: 'slug' })

    if (error) return apiResponse(500, null, error.message)

    let alertSummary = null
    try {
      const { data: alertTopics } = await admin
        .from('trending_topics')
        .select('keyword, slug, search_volume, created_at')
        .in('slug', payload.map((item) => item.slug))
        .limit(200)

      alertSummary = await processTrendAlerts(admin, alertTopics || [])
    } catch (alertError) {
      alertSummary = {
        error: alertError?.message || 'Trend alert processing failed',
      }
    }

    return apiResponse(200, {
      inserted: payload.length,
      updated: payload.length,
      total: payload.length,
      source: 'google-trends-rss',
      geos: (process.env.TRENDS_GEO_LIST || 'US,IN,GB,CA,AU')
        .split(',')
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean),
      alert_summary: alertSummary,
      fetched_at: now,
    }, null)
  } catch (error) {
    console.error(error)
    return apiResponse(500, null, 'An internal error occurred')
  }
}




