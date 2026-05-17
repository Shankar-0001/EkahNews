import { createOptionalPublicClient } from '@/lib/supabase/public-server'
import PublicHeader from '@/components/layout/PublicHeader'
import LatestFeedList from '@/components/content/LatestFeedList'
import { getLatestFeedPage } from '@/lib/latest-feed'
import { absoluteUrl } from '@/lib/site-config'
import { notFound, permanentRedirect } from 'next/navigation'
import { runListQuery } from '@/lib/supabase/query-timeout'

const LATEST_FEED_PAGE_SIZE = 12

export const revalidate = 300

function toPageNumber(raw) {
  const page = Number.parseInt(raw, 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

export async function generateMetadata({ params }) {
  const page = toPageNumber(params.page)
  const canonical = page <= 1
    ? absoluteUrl('/latest-news')
    : absoluteUrl(`/latest-news/page/${page}`)
  const title = page <= 1
    ? 'Latest News - EkahNews'
    : `Latest News | Page ${page} | EkahNews`
  const description = page <= 1
    ? 'Latest published articles and web stories on EkahNews, ordered from newest to oldest.'
    : `Latest published articles and web stories on EkahNews, page ${page}.`

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    robots: {
      index: false,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function LatestNewsPaginationPage({ params }) {
  const page = toPageNumber(params.page)

  if (page <= 1) {
    permanentRedirect('/latest-news')
  }

  const supabase = createOptionalPublicClient()

  let categories = []
  let feedItems = []
  let hasMore = false
  let total = 0
  let unavailable = false

  if (supabase) {
    try {
      const [categoriesRes, latestFeed] = await Promise.all([
        runListQuery(
          (signal) => supabase
            .from('categories')
            .select('id, name, slug')
            .order('name')
            .abortSignal(signal),
          { label: `latestNewsPage:${page}:getCategories` }
        ),
        getLatestFeedPage(supabase, { page, pageSize: LATEST_FEED_PAGE_SIZE }),
      ])

      categories = categoriesRes.data || []
      feedItems = latestFeed.items || []
      hasMore = Boolean(latestFeed.hasMore)
      total = latestFeed.total || 0
      unavailable = Boolean(latestFeed.unavailable)
    } catch (error) {
      console.error(`Latest news page ${page} fetch failed:`, error)
      unavailable = true
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LATEST_FEED_PAGE_SIZE))
  if (!unavailable && total > 0 && page > totalPages) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <PublicHeader categories={categories} />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
        {feedItems.length > 0 ? (
          <LatestFeedList
            initialItems={feedItems}
            initialHasMore={hasMore}
            pageSize={LATEST_FEED_PAGE_SIZE}
            initialPage={page}
            enableInfiniteScroll={false}
            paginationBasePath="/latest-news"
            showPaginationNav
          />
        ) : (
          <section className="border border-slate-200 bg-white p-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            {unavailable
              ? 'Latest news is temporarily unavailable. Please try again shortly.'
              : 'No published stories are available yet.'}
          </section>
        )}
      </main>
    </div>
  )
}
