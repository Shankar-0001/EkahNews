import { createClient as createPublicClient } from '@supabase/supabase-js'
import PublicHeader from '@/components/layout/PublicHeader'
import StructuredData from '@/components/seo/StructuredData'
import ArticleMiniCard from '@/components/content/ArticleMiniCard'
import { absoluteUrl, buildLanguageAlternates, getPublicationLogoUrl, slugFromText } from '@/lib/site-config'
import { notFound, permanentRedirect } from 'next/navigation'
import { stripHtml } from '@/lib/content-utils'
import Link from 'next/link'

export const revalidate = 1200
const MIN_MATCH_COUNT = 3
const MAX_ARTICLES = 20

function normalizeKeyword(raw = '') {
  return slugFromText(String(raw).replace(/-/g, ' ').trim())
}

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
    const { data: rows } = await supabase
      .from('trending_topics')
      .select('slug')
      .order('updated_at', { ascending: false })
      .limit(60)

    return (rows || []).map((item) => ({ keyword: item.slug }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }) {
  const raw = decodeURIComponent(params.keyword || '')
  const keyword = raw.replace(/-/g, ' ').trim()
  const normalized = normalizeKeyword(keyword)
  if (!normalized) {
    return { title: 'Explained | EkahNews', robots: { index: false, follow: false } }
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
      .or(`title.ilike.${pattern},excerpt.ilike.${pattern}`)
    matchCount = count || 0
  }

  const url = absoluteUrl(`/explained/${normalized}`)
  const ogImage = getPublicationLogoUrl()
  return {
    title: `${keyword} Explained | EkahNews`,
    description: `Simple explainers and latest context for ${keyword}, with linked source articles.`,
    keywords: `${keyword}, what is ${keyword}, ${keyword} explained, ${keyword} guide`,
    alternates: { canonical: url, languages: buildLanguageAlternates(`/explained/${normalized}`) },
    robots: {
      index: matchCount >= MIN_MATCH_COUNT,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
    openGraph: {
      title: `${keyword} Explained`,
      description: `Explainers for ${keyword}.`,
      url,
      type: 'article',
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${keyword} Explained`,
      description: `Explainers for ${keyword}.`,
      images: [ogImage],
    },
  }
}

function makeExplainers(articles, keyword) {
  return articles.slice(0, 4).map((a) => {
    const sentences = stripHtml(a.content || a.excerpt || '')
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    return {
      title: a.title,
      point: sentences.find((s) => s.toLowerCase().includes(keyword.toLowerCase())) || sentences[0] || a.excerpt || a.title,
      slug: a.slug,
      categorySlug: a.categories?.slug || 'news',
    }
  })
}

export default async function ExplainedKeywordPage({ params }) {
  const raw = decodeURIComponent(params.keyword || '')
  const keyword = raw.replace(/-/g, ' ').trim()
  const normalized = normalizeKeyword(keyword)
  if (!normalized) notFound()
  if (normalized !== raw) {
    permanentRedirect(`/explained/${normalized}`)
  }
  const supabase = createPublicClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const pattern = keywordPattern(keyword)

  const articlesQuery = supabase
    .from('articles')
    .select('id, title, slug, excerpt, content, featured_image_url, published_at, categories(name, slug)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(MAX_ARTICLES)

  if (pattern) {
    articlesQuery.or(`title.ilike.${pattern},excerpt.ilike.${pattern}`)
  }

  const [{ data: categories }, { data: articles }, { data: engagementRows }] = await Promise.all([
    supabase.from('categories').select('id, name, slug').order('name'),
    articlesQuery,
    supabase.from('article_engagement').select('article_id, views, likes, shares').limit(10),
  ])

  const matched = articles || []
  if (matched.length < MIN_MATCH_COUNT) notFound()

  const explainers = makeExplainers(matched, keyword)
  const scoreMap = new Map((engagementRows || []).map((row) => [row.article_id, (row.views || 0) + (row.likes || 0) * 3 + (row.shares || 0) * 5]))
  const trending = [...matched]
    .map((item) => ({ ...item, _score: scoreMap.get(item.id) || 0 }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 6)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: explainers.map((item) => ({
      '@type': 'Question',
      name: item.title,
      acceptedAnswer: { '@type': 'Answer', text: item.point },
    })),
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StructuredData data={jsonLd} />
      <PublicHeader categories={categories || []} />
      <main className="w-full max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">{keyword} Explained</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Fast context and explainers linked to full coverage.</p>

        <section className="mb-10 rounded-xl bg-white dark:bg-gray-800 p-6 border dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Key Explainers</h2>
          <ul className="space-y-3">
            {explainers.map((item) => (
              <li key={item.slug} className="text-gray-700 dark:text-gray-300">
                <Link className="font-semibold text-blue-600 dark:text-blue-400 hover:underline" href={`/${item.categorySlug}/${item.slug}`}>{item.title}</Link>
                <p className="text-sm mt-1">{item.point}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Trending Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trending.map((article) => <ArticleMiniCard key={article.id} article={article} compact />)}
          </div>
        </section>
      </main>
    </div>
  )
}



