import { NextResponse } from 'next/server'
import { createOptionalPublicClient } from '@/lib/supabase/public-server'
import { getLatestFeedPage } from '@/lib/latest-feed'
import { checkRateLimit, getClientIp } from '@/lib/request-guards'

export async function GET(request) {
  const rateResult = checkRateLimit({
    key: `${getClientIp(request)}:latest-feed`,
    limit: 120,
    windowMs: 60 * 1000,
  })

  if (!rateResult.allowed) {
    return NextResponse.json({
      items: [],
      hasMore: false,
      page: 1,
    }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const page = searchParams.get('page') || '1'
  const limit = searchParams.get('limit') || '12'

  try {
    const supabase = createOptionalPublicClient()
    const result = await getLatestFeedPage(supabase, { page, pageSize: limit })

    return NextResponse.json({
      items: result.items,
      hasMore: result.hasMore,
      page: result.page,
      total: result.total,
    })
  } catch (error) {
    console.error('[latest-feed API] Error:', error)
    return NextResponse.json({
      items: [],
      hasMore: false,
      page: 1,
    }, { status: 200 })
  }
}
