import { NextResponse } from 'next/server'
import { getContinuousReaderArticles, getContinuousReaderClient } from '@/lib/continuous-reader'
import { checkRateLimit, getClientIp } from '@/lib/request-guards'

export async function GET(request) {
  const rateResult = checkRateLimit({
    key: `${getClientIp(request)}:related-articles`,
    limit: 120,
    windowMs: 60 * 1000,
  })

  if (!rateResult.allowed) {
    return NextResponse.json({ articles: [] }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const currentSlug = searchParams.get('slug')
  const categorySlug = searchParams.get('category')
  const limit = Number.parseInt(searchParams.get('limit') || '1', 10)
  const excludeSlugs = (searchParams.get('exclude') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (!currentSlug || !categorySlug) {
    return NextResponse.json({ articles: [] }, { status: 400 })
  }

  try {
    const supabase = getContinuousReaderClient()
    if (!supabase) {
      return NextResponse.json({ articles: [] }, { status: 200 })
    }

    const normalizedLimit = Math.min(3, Math.max(1, Number.isFinite(limit) ? limit : 1))

    const articles = await getContinuousReaderArticles(supabase, {
      currentSlug,
      categorySlug,
      excludeSlugs,
      limit: normalizedLimit,
    })

    return NextResponse.json({ articles: (articles || []).slice(0, normalizedLimit) })
  } catch (error) {
    console.error('[related-articles API] Error:', error)
    return NextResponse.json({ articles: [] }, { status: 200 })
  }
}
