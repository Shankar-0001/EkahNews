import { createOptionalPublicClient } from '@/lib/supabase/public-server'
import PublicHeader from '@/components/layout/PublicHeader'
import LatestFeedList from '@/components/content/LatestFeedList'
import { getLatestFeedPage } from '@/lib/latest-feed'

const LATEST_FEED_PAGE_SIZE = 12

export const revalidate = 300

export const metadata = {
  title: 'Latest News - EkahNews',
  description: 'Latest published articles and web stories on EkahNews, ordered from newest to oldest.',
  alternates: {
    canonical: 'https://www.ekahnews.com/latest-news',
  },
  openGraph: {
    title: 'Latest News - EkahNews',
    description: 'Latest published articles and web stories on EkahNews.',
    url: 'https://www.ekahnews.com/latest-news',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Latest News - EkahNews',
    description: 'Latest published articles and web stories on EkahNews.',
  },
}

export default async function LatestNewsPage() {
  const supabase = createOptionalPublicClient()

  let categories = []
  let feedItems = []
  let hasMore = false

  if (supabase) {
    try {
      const [categoriesRes, latestFeed] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name, slug')
          .order('name'),
        getLatestFeedPage(supabase, { page: 1, pageSize: LATEST_FEED_PAGE_SIZE }),
      ])

      categories = categoriesRes.data || []
      feedItems = latestFeed.items || []
      hasMore = Boolean(latestFeed.hasMore)
    } catch (error) {
      console.error('Latest news page fetch failed:', error)
    }
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
          />
        ) : (
          <section className="border border-slate-200 bg-white p-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            No published stories are available yet.
          </section>
        )}
      </main>
    </div>
  )
}
