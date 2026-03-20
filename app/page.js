import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, User, TrendingUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { HeaderAd, InArticleAd } from '@/components/ads/AdComponent'
import StructuredData, { OrganizationSchema, WebSiteSchema } from '@/components/seo/StructuredData'
import PublicHeader from '@/components/layout/PublicHeader'
import BreakingNewsTicker from '@/components/common/BreakingNewsTicker'
import Image from 'next/image'
import { calculateReadingTime } from '@/lib/content-utils'
import ArticleMiniCard from '@/components/content/ArticleMiniCard'
import WebStoryCard from '@/components/content/WebStoryCard'

// Revalidate homepage every 10 minutes (ISR)
export const revalidate = 600
const HOMEPAGE_CATEGORY_LIMIT = 6
const CATEGORY_ARTICLE_LIMIT = 5

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ekahnews.com'
const ogImage = `${siteUrl}/logo.png`

export const metadata = {
  title: 'EkahNews - Latest News and Insights',
  description: 'Your source for the latest news, trending stories, and expert insights across multiple categories.',
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: 'EkahNews - Latest News and Insights',
    description: 'Your source for the latest news, trending stories, and expert insights.',
    type: 'website',
    url: siteUrl,
    images: [{ url: ogImage }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EkahNews - Latest News and Insights',
    description: 'Your source for the latest news, trending stories, and expert insights across multiple categories.',
    images: [ogImage],
  },
}

export default async function HomePage() {
  const supabase = await createClient()
  const adsEnabled = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true'
  let articles = []
  let categories = []
  let engagement = []
  let webStories = []
  let homepageCategoryBlocks = []

  try {
    const [articlesRes, categoriesRes, engagementRes, storiesRes, categoryStatsRes] = await Promise.all([
      supabase
        .from('articles')
        .select(`
          id,
          title,
          slug,
          excerpt,
          featured_image_url,
          published_at,
          authors (name),
          categories (name, slug)
        `)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(10),
      supabase
        .from('categories')
        .select('id, name, slug')
        .order('name'),
      supabase
        .from('article_engagement')
        .select('article_id, views, likes, shares')
        .limit(10),
      supabase
        .from('web_stories')
        .select('id, title, slug, cover_image, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('articles')
        .select('id, category_id, published_at')
        .eq('status', 'published')
        .not('category_id', 'is', null)
        .order('published_at', { ascending: false }),
    ])

    articles = articlesRes.data || []
    categories = categoriesRes.data || []
    engagement = engagementRes.data || []
    webStories = storiesRes.data || []

    const categoryMetaById = new Map((categoriesRes.data || []).map((category) => [category.id, category]))
    const categoryStats = new Map()

    for (const article of categoryStatsRes.data || []) {
      if (!article?.category_id) continue
      const existing = categoryStats.get(article.category_id) || {
        count: 0,
        latestPublishedAt: article.published_at || null,
      }

      categoryStats.set(article.category_id, {
        count: existing.count + 1,
        latestPublishedAt: existing.latestPublishedAt || article.published_at || null,
      })
    }

    const selectedCategoryIds = [...categoryStats.entries()]
      .filter(([categoryId, stats]) => categoryMetaById.has(categoryId) && stats.count >= CATEGORY_ARTICLE_LIMIT)
      .sort((a, b) => {
        const dateA = new Date(a[1].latestPublishedAt || 0).getTime()
        const dateB = new Date(b[1].latestPublishedAt || 0).getTime()
        if (dateB !== dateA) return dateB - dateA
        return (categoryMetaById.get(a[0])?.name || '').localeCompare(categoryMetaById.get(b[0])?.name || '')
      })
      .slice(0, HOMEPAGE_CATEGORY_LIMIT)
      .map(([categoryId]) => categoryId)

    if (selectedCategoryIds.length > 0) {
      const { data: categoryArticles } = await supabase
        .from('articles')
        .select(`
          id,
          title,
          slug,
          excerpt,
          featured_image_url,
          published_at,
          category_id,
          authors (name),
          categories (name, slug)
        `)
        .eq('status', 'published')
        .in('category_id', selectedCategoryIds)
        .order('published_at', { ascending: false })

      const selectedCategorySet = new Set(selectedCategoryIds)
      const articlesByCategoryId = new Map()
      for (const article of categoryArticles || []) {
        const categoryId = article.category_id
        if (!categoryId || !selectedCategorySet.has(categoryId)) continue

        const items = articlesByCategoryId.get(categoryId) || []
        if (items.length < CATEGORY_ARTICLE_LIMIT) {
          items.push(article)
          articlesByCategoryId.set(categoryId, items)
        }
      }

      homepageCategoryBlocks = selectedCategoryIds
        .map((categoryId) => {
          const category = categoryMetaById.get(categoryId)
          const categoryArticlesForBlock = articlesByCategoryId.get(categoryId) || []
          if (!category || categoryArticlesForBlock.length < CATEGORY_ARTICLE_LIMIT) return null

          return {
            ...category,
            articles: categoryArticlesForBlock,
          }
        })
        .filter(Boolean)
    }
  } catch (error) {
    console.error('Homepage data fetch failed:', error)
  }

  const featuredArticle = articles?.[0]
  const breakingNews = (articles || [])
    .slice(0, 5)
    .map((article) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      categories: { slug: article.categories?.slug || 'news' },
    }))
  const engagementMap = new Map((engagement || []).map((row) => [row.article_id, row]))
  const trendingBySignals = [...(articles || [])]
    .map((article) => {
      const m = engagementMap.get(article.id) || { views: 0, likes: 0, shares: 0 }
      return { ...article, _score: (m.views || 0) + (m.likes || 0) * 3 + (m.shares || 0) * 5 }
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, 5)
  const finalTrending = trendingBySignals.length > 0 ? trendingBySignals : (articles || []).slice(0, 5)
  const mostShared = [...(articles || [])]
    .map((article) => {
      const m = engagementMap.get(article.id) || { shares: 0 }
      return { ...article, _shares: m.shares || 0 }
    })
    .sort((a, b) => b._shares - a._shares)
    .slice(0, 6)


  return (
    <>
      <StructuredData data={OrganizationSchema()} />
      <StructuredData data={WebSiteSchema()} />

      <div className="bg-gray-50 dark:bg-gray-900">
        <PublicHeader categories={categories || []} />

        {/* Breaking News Ticker */}
        {breakingNews && breakingNews.length > 0 && (
          <BreakingNewsTicker news={breakingNews} />
        )}

        {/* Hero Section with Featured Article */}
        {featuredArticle && (
          <div className="bg-gradient-to-b from-white via-slate-50 to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 py-12 md:py-16">
            <div className="w-full max-w-6xl mx-auto px-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  {featuredArticle.categories && (
                    <Badge variant="secondary" className="mb-4">
                      {featuredArticle.categories.name}
                    </Badge>
                  )}
                  <h1 className="text-[30px] md:text-5xl font-bold mb-4 text-gray-900 dark:text-white leading-tight">
                    {featuredArticle.title}
                  </h1>
                  <p className="text-[19px] text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                    {featuredArticle.excerpt}
                  </p>
                  <div className="flex items-center gap-6 text-gray-500 dark:text-gray-400 mb-6">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{featuredArticle.authors?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {formatDistanceToNow(new Date(featuredArticle.published_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/${featuredArticle.categories?.slug || 'news'}/${featuredArticle.slug}`}
                    prefetch
                  >
                    <Button size="lg" variant="default">
                      Read Article
                    </Button>
                  </Link>
                </div>
                {featuredArticle.featured_image_url && (
                  <div className="relative h-96 rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5 dark:ring-white/10">
                    <Image
                      src={featuredArticle.featured_image_url}
                      alt={featuredArticle.title}
                      fill
                      className="object-cover"
                      priority
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 640px"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="w-full max-w-6xl mx-auto px-4 py-12 md:py-16">
          {/* Header Ad */}
          <div className="hidden md:block pb-4">
            <HeaderAd />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Articles Column */}
            <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Latest Articles</h2>
              </div>

              {articles && articles.length > 0 ? (
                <div className="space-y-6">
                  {articles.slice(1).map((article, idx) => (
                    <div key={article.id}>
                      <Link href={`/${article.categories?.slug || 'news'}/${article.slug}`}>
                        <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer dark:bg-gray-800 dark:border-gray-700">
                          <div className="flex flex-col md:flex-row">
                            {article.featured_image_url && (
                              <div className="relative w-full md:w-64 h-48 md:h-auto">
                                <Image
                                  src={article.featured_image_url}
                                  alt={article.title}
                                  fill
                                  className="object-cover md:rounded-l-lg md:rounded-t-none"
                                  sizes="(max-width: 768px) 100vw, 256px"
                                />
                              </div>
                            )}
                            <CardContent className="flex-1 p-5 md:p-6">
                              <div className="flex items-center gap-2 mb-3">
                                {article.categories && (
                                  <Badge variant="secondary" className="dark:bg-gray-700">
                                    {article.categories.name}
                                  </Badge>
                                )}
                              </div>
                              <h3 className="text-xl font-bold mb-2 dark:text-white leading-snug">{article.title}</h3>
                              <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                                {article.excerpt}
                              </p>
                              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span>{article.authors?.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                {calculateReadingTime(article.excerpt || article.title || '')} min read
                              </p>
                            </CardContent>
                          </div>
                        </Card>
                      </Link>
                      {adsEnabled && (idx + 1) % 4 === 0 && (
                        <div className="rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                          <InArticleAd />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400 text-lg">
                    No articles published yet. Check back soon!
                  </p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              {/* Trending Articles */}
              <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-5 w-5 text-orange-500" />
                    <h3 className="text-xl font-bold dark:text-white">Trending Now</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {finalTrending.map((article) => (
                      <ArticleMiniCard key={article.id} article={article} compact />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4 dark:text-white">Most Shared</h3>
                  <div className="space-y-3">
                    {mostShared.map((article) => (
                      <Link key={article.id} href={`/${article.categories?.slug || 'news'}/${article.slug}`} className="block hover:underline text-blue-600 dark:text-blue-400">
                        {article.title}
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Categories */}
              <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4 dark:text-white">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {categories?.map(category => (
                      <Link key={category.id} href={`/category/${category.slug}`}>
                        <Badge variant="outline" className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300">
                          {category.name}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Sidebar Ad */}
              {/* <SidebarAd /> */}
            </div>
          </div>

          {homepageCategoryBlocks.length > 0 && (
            <section className="mt-12 md:mt-14">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">Categories</h2>
              <div className="space-y-10">
                {homepageCategoryBlocks.map((block) => (
                  <section key={block.id}>
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">{block.name}</h3>
                      <Link href={`/category/${block.slug}`} className="text-blue-600 dark:text-blue-400 text-sm hover:underline">
                        View All
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
                      {block.articles.map((article) => (
                        <ArticleMiniCard key={article.id} article={article} compact />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          )}

          {webStories.length > 0 && (
            <section className="mt-12 md:mt-14">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Top Web Stories</h2>
                <Link href="/web-stories" className="text-blue-600 dark:text-blue-400 hover:underline">View all</Link>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {webStories.slice(0, 5).map((story) => (
                  <div key={story.id} className="min-w-[180px] max-w-[180px]">
                    <WebStoryCard story={story} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

      </div>
    </>
  )
}
