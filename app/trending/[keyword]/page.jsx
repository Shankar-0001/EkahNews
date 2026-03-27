import { createPublicClient } from '@/lib/supabase/public-server'
import PublicHeader from '@/components/layout/PublicHeader'
import StructuredData from '@/components/seo/StructuredData'
import ArticleMiniCard from '@/components/content/ArticleMiniCard'
import WebStoryCard from '@/components/content/WebStoryCard'
import { absoluteUrl, buildLanguageAlternates, slugFromText } from '@/lib/site-config'
import { notFound, permanentRedirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export const revalidate = 900
const MIN_MATCH_COUNT = 3
const MAX_ARTICLES = 40

const HERO_IMAGE = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1600&q=80&auto=format&fit=crop'

function keywordPattern(keyword = '') {
  const cleaned = keyword.replace(/[^a-z0-9\s-]/gi, ' ').trim()
  if (!cleaned) return null
  return `%${cleaned}%`
}

export async function generateStaticParams() {
  try {
    const supabase = createPublicClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { data: trendRows } = await supabase
      .from('trending_topics')
      .select('slug')
      .order('updated_at', { ascending: false })
      .limit(60)

    return (trendRows || []).map((row) => ({ keyword: row.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }) {
  const raw = decodeURIComponent(params.keyword || '')
  const keyword = raw.replace(/-/g, ' ').trim()
  const normalized = slugFromText(keyword)
  if (!normalized) {
    return { title: 'Trending | EkahNews', robots: { index: false, follow: false } }
  }

  const supabase = createPublicClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const pattern = keywordPattern(keyword)
  const [{ data: trendRow }, { count }] = await Promise.all([
    supabase
      .from('trending_topics')
      .select('slug')
      .eq('slug', normalized)
      .maybeSingle(),
    pattern
      ? supabase
        .from('articles')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .or(`title.ilike.${pattern},excerpt.ilike.${pattern}`)
      : Promise.resolve({ count: 0 }),
  ])

  const indexable = !!trendRow && (count || 0) >= MIN_MATCH_COUNT
  const url = absoluteUrl(`/trending/${normalized}`)
  return {
    title: `${keyword} News, Updates and Explanation`,
    description: `Latest news, updates and analysis about ${keyword}`,
    keywords: `${keyword}, trending ${keyword}, ${keyword} news, ${keyword} analysis`,
    alternates: { canonical: url, languages: buildLanguageAlternates(`/trending/${normalized}`) },
    openGraph: {
      title: `${keyword} News, Updates and Explanation`,
      description: `Latest news, updates and analysis about ${keyword}`,
      url,
      type: 'website',
      images: [{ url: HERO_IMAGE, width: 1600, height: 900, alt: `${keyword} trending news` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${keyword} News, Updates and Explanation`,
      description: `Latest news, updates and analysis about ${keyword}`,
      images: [HERO_IMAGE],
    },
    robots: {
      index: indexable,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  }
}

export default async function TrendingKeywordPage({ params }) {
  const keywordSlug = decodeURIComponent(params.keyword || '')
  const keyword = keywordSlug.replace(/-/g, ' ').trim()
  const keywordLower = keyword.toLowerCase()
  const supabase = createPublicClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const normalizedRequested = slugFromText(keyword)
  const pattern = keywordPattern(keyword)

  if (!normalizedRequested || !pattern) {
    notFound()
  }
  if (normalizedRequested !== keywordSlug) {
    permanentRedirect(`/trending/${normalizedRequested}`)
  }

  const articlesQuery = supabase
    .from('articles')
    .select('id, title, slug, excerpt, featured_image_url, published_at, categories(name, slug), authors(name)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(MAX_ARTICLES)

  articlesQuery.or(`title.ilike.${pattern},excerpt.ilike.${pattern}`)

  const [
    { data: categories },
    { data: requestedTrend },
    { data: trendRows },
    { data: matchedArticles },
    { data: engagementRows },
    { data: allStories },
  ] = await Promise.all([
    supabase.from('categories').select('id, name, slug').order('name'),
    supabase.from('trending_topics').select('keyword, slug, search_volume, created_at, updated_at').eq('slug', normalizedRequested).maybeSingle(),
    supabase.from('trending_topics').select('keyword, slug, search_volume, created_at, updated_at').order('search_volume', { ascending: false }).limit(10),
    articlesQuery,
    supabase.from('article_engagement').select('article_id, views, likes, shares').limit(10),
    supabase.from('web_stories').select('id, title, slug, cover_image, slides, created_at').order('created_at', { ascending: false }).limit(10),
  ])

  const trendKeyword = requestedTrend || (trendRows || []).find((row) => row.slug === normalizedRequested)
  const relatedByKeyword = matchedArticles || []

  if (!trendKeyword && relatedByKeyword.length < MIN_MATCH_COUNT) {
    notFound()
  }

  let fallbackArticles = []
  if (relatedByKeyword.length < MIN_MATCH_COUNT) {
    const { data: latestFallback } = await supabase
      .from('articles')
      .select('id, title, slug, excerpt, featured_image_url, published_at, categories(name, slug), authors(name)')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(12)
    fallbackArticles = latestFallback || []
  }

  const baseArticles = relatedByKeyword.length >= MIN_MATCH_COUNT ? relatedByKeyword : fallbackArticles
  const scoreMap = new Map((engagementRows || []).map((row) => [row.article_id, (row.views || 0) + (row.likes || 0) * 3 + (row.shares || 0) * 5]))

  const trendingArticles = [...baseArticles]
    .map((a) => ({ ...a, _score: scoreMap.get(a.id) || 0 }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 12)

  const latestArticles = [...baseArticles]
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
    .slice(0, 8)

  const explainedArticles = baseArticles
    .filter((a) => /explain|guide|what is|how to|analysis/i.test(`${a.title || ''} ${a.excerpt || ''}`))
    .slice(0, 6)

  const relatedTopics = [
    ...(requestedTrend && !(trendRows || []).some((row) => row.slug === requestedTrend.slug) ? [requestedTrend] : []),
    ...(trendRows || []),
  ]
    .filter((row) => row.slug !== normalizedRequested)
    .slice(0, 8)

  const relatedStories = (allStories || [])
    .filter((story) => {
      const text = `${story.title || ''} ${JSON.stringify(story.slides || [])}`.toLowerCase()
      return text.includes(keywordLower)
    })
    .slice(0, 6)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    headline: `${keyword} News, Updates and Explanation`,
    description: `Latest news, updates and analysis about ${keyword}`,
    datePublished: trendKeyword?.created_at || new Date().toISOString(),
    keywords: [keyword, 'news', 'trending', 'updates'],
    url: absoluteUrl(`/trending/${normalizedRequested}`),
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StructuredData data={jsonLd} />
      <PublicHeader categories={categories || []} />

      <main className="w-full max-w-6xl mx-auto px-4 py-10 md:py-14">
        <section className="mb-10 overflow-hidden rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="relative aspect-[16/9] w-full">
            <Image
              src={HERO_IMAGE}
              alt={`${keyword} trending hero image`}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1200px) 100vw, 1200px"
            />
          </div>
          <div className="p-6 md:p-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3 capitalize">
              {keyword} Trends
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              {relatedByKeyword.length >= MIN_MATCH_COUNT
                ? `Real-time coverage, explainers, and related content around ${keyword}.`
                : `We are tracking ${keyword}. Here is the latest coverage while deeper trend-specific matches build up.`}
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Latest Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {latestArticles.slice(0, 9).map((article) => <ArticleMiniCard key={article.id} article={article} />)}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Explained Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(explainedArticles.length ? explainedArticles : latestArticles.slice(0, 6)).map((article) => (
              <ArticleMiniCard key={article.id} article={article} compact />
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Trending Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingArticles.slice(0, 9).map((article) => <ArticleMiniCard key={article.id} article={article} />)}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Related Topics</h2>
          <div className="flex flex-wrap gap-2">
            {relatedTopics.map((topic) => (
              <Link key={topic.slug} href={`/trending/${topic.slug}`} className="px-3 py-1.5 rounded-full border text-sm text-blue-700 dark:text-blue-300 hover:underline">
                {topic.keyword}
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Web Stories</h2>
          {relatedStories.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {relatedStories.map((story) => <WebStoryCard key={story.id} story={story} />)}
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">No related web stories yet.</p>
          )}
        </section>
      </main>
    </div>
  )
}
