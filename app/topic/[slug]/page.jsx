import { createClient as createPublicClient } from '@supabase/supabase-js'
import PublicHeader from '@/components/layout/PublicHeader'
import ArticleMiniCard from '@/components/content/ArticleMiniCard'
import StructuredData from '@/components/seo/StructuredData'
import { absoluteUrl, slugFromText } from '@/lib/site-config'
import { notFound, permanentRedirect } from 'next/navigation'

export const revalidate = 900
const MIN_MATCH_COUNT = 3
const MAX_ARTICLES = 30

function normalizeKeyword(raw = '') {
  return slugFromText(String(raw).replace(/-/g, ' ').trim())
}

function keywordPattern(keyword = '') {
  const cleaned = keyword.replace(/[^a-z0-9\s-]/gi, ' ').trim()
  if (!cleaned) return null
  return `%${cleaned}%`
}

export async function generateMetadata({ params }) {
  const slug = decodeURIComponent(params.slug || '')
  const keyword = slug.replace(/-/g, ' ').trim()
  const normalized = normalizeKeyword(keyword)
  if (!normalized) {
    return { title: 'Topic Not Found | EkahNews', robots: { index: false, follow: false } }
  }

  const supabase = createPublicClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const pattern = keywordPattern(keyword)
  let matchCount = 0
  if (pattern) {
    const { count } = await supabase
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .or(`title.ilike.${pattern},excerpt.ilike.${pattern},content.ilike.${pattern}`)
    matchCount = count || 0
  }

  const canonical = absoluteUrl(`/topic/${normalized}`)
  const title = `${keyword} News and Updates | EkahNews`
  const description = `Latest news, updates, and explainers about ${keyword} on EkahNews.`
  const ogImage = absoluteUrl('/logo.png')
  const indexable = matchCount >= MIN_MATCH_COUNT

  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: indexable,
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
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export async function generateStaticParams() {
  try {
    const supabase = createPublicClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data: rows } = await supabase
      .from('trending_topics')
      .select('slug')
      .order('updated_at', { ascending: false })
      .limit(60)

    return (rows || []).map((item) => ({ slug: item.slug }))
  } catch {
    return []
  }
}

export default async function TopicPage({ params }) {
  const supabase = createPublicClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const slug = decodeURIComponent(params.slug || '')
  const keyword = slug.replace(/-/g, ' ').trim()
  const normalized = normalizeKeyword(keyword)
  if (!normalized) {
    notFound()
  }
  if (normalized !== slug) {
    permanentRedirect(`/topic/${normalized}`)
  }
  const pattern = keywordPattern(keyword)

  const articlesQuery = supabase
    .from('articles')
    .select('id, title, slug, excerpt, featured_image_url, published_at, categories(name, slug), authors(name)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(MAX_ARTICLES)

  if (pattern) {
    articlesQuery.or(`title.ilike.${pattern},excerpt.ilike.${pattern},content.ilike.${pattern}`)
  }

  const [{ data: categories }, { data: articles }, { data: engagementRows }] = await Promise.all([
    supabase.from('categories').select('id, name, slug').order('name'),
    articlesQuery,
    supabase.from('article_engagement').select('article_id, views, likes, shares').limit(10),
  ])

  const matched = articles || []
  const isThinTopic = matched.length < MIN_MATCH_COUNT
  let fallbackArticles = []

  if (isThinTopic) {
    const { data: latestArticles } = await supabase
      .from('articles')
      .select('id, title, slug, excerpt, featured_image_url, published_at, categories(name, slug), authors(name)')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(12)
    fallbackArticles = latestArticles || []
  }

  const scoreMap = new Map((engagementRows || []).map((row) => [row.article_id, (row.views || 0) + (row.likes || 0) * 3 + (row.shares || 0) * 5]))
  const trending = (isThinTopic ? fallbackArticles : matched)
    .map((item) => ({ ...item, _score: scoreMap.get(item.id) || 0 }))
    .sort((a, b) => b._score - a._score)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${keyword} News`,
    url: absoluteUrl(`/topic/${normalized}`),
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StructuredData data={jsonLd} />
      <PublicHeader categories={categories || []} />

      <main className="w-full max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white capitalize">{keyword}</h1>
          {isThinTopic ? (
            <p className="text-gray-600 dark:text-gray-400">
              We are still building coverage for {keyword}. Here are the latest stories in the meantime.
            </p>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">Latest coverage and explainers around {keyword}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trending.map((article) => (
            <ArticleMiniCard key={article.id} article={article} />
          ))}
        </div>
      </main>
    </div>
  )
}

