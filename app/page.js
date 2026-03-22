import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Calendar, TrendingUp, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import StructuredData, { OrganizationSchema, WebSiteSchema } from '@/components/seo/StructuredData'
import PublicHeader from '@/components/layout/PublicHeader'
import BreakingNewsTicker from '@/components/common/BreakingNewsTicker'
import Image from 'next/image'
import { calculateReadingTime } from '@/lib/content-utils'
import ArticleMiniCard from '@/components/content/ArticleMiniCard'
import WebStoryCard from '@/components/content/WebStoryCard'
import { getPublicationLogoUrl } from '@/lib/site-config'

// Revalidate homepage every 10 minutes (ISR)
export const revalidate = 600
const HOMEPAGE_CATEGORY_LIMIT = 6
const CATEGORY_ARTICLE_LIMIT = 5

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ekahnews.com'
const ogImage = getPublicationLogoUrl()

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
        .limit(18),
      supabase
        .from('categories')
        .select('id, name, slug')
        .order('name'),
      supabase
        .from('article_engagement')
        .select('article_id, views, likes, shares')
        .limit(18),
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
  const mostShared = [...(articles || [])]
    .map((article) => {
      const m = engagementMap.get(article.id) || { shares: 0 }
      return { ...article, _shares: m.shares || 0 }
    })
    .sort((a, b) => b._shares - a._shares)
    .slice(0, 6)
  const heroLeftArticles = (articles || []).slice(1, 3)
  const heroRightArticles = (articles || []).slice(3, 8)
  const latestLeadArticles = (articles || []).slice(7, 9)
  const latestFeedArticles = (articles || []).slice(9, 15)
  const quickTakeArticles = (articles || []).slice(2, 7)
  const spotlightArticles = (articles || []).slice(1, 5)
  const sidebarSharedArticles = mostShared.filter((article) => article.id !== featuredArticle?.id).slice(0, 4)
  const categoryHighlights = homepageCategoryBlocks.slice(0, 3)


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
          <div className="bg-white dark:bg-slate-950 py-6 md:py-8 border-b border-stone-200 dark:border-slate-800">
            <div className="w-full max-w-6xl mx-auto px-4">
              <div className="mb-5 border-b border-slate-200 pb-4 text-center dark:border-slate-800">
                <h1 className="mt-2 text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white">
                  Today&apos;s Top Stories
                </h1>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,0.62fr)_minmax(0,1.18fr)_minmax(240px,0.75fr)] gap-4 md:gap-5 items-start">
                <div className="space-y-4 order-2 lg:order-1">
                  {heroLeftArticles.map((article, index) => (
                    <Link
                      key={article.id}
                      href={`/${article.categories?.slug || 'news'}/${article.slug}`}
                      className={`group block rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${index === 1 ? 'lg:mt-4' : ''}`}
                    >
                      {article.featured_image_url && (
                        <div className="relative aspect-[4/3] overflow-hidden rounded-[14px]">
                          <Image
                            src={article.featured_image_url}
                            alt={article.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            sizes="(max-width: 1024px) 100vw, 240px"
                          />
                        </div>
                      )}
                      <div className="pt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                          {article.categories?.name || 'News'}
                        </p>
                        <h4 className="mt-2 text-base md:text-lg font-semibold leading-snug text-slate-900 dark:text-white line-clamp-3">
                          {article.title}
                        </h4>
                        {article.excerpt && (
                          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400 line-clamp-2">
                            {article.excerpt}
                          </p>
                        )}
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                          {article.authors?.name && (
                            <span className="inline-flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5" />
                              {article.authors.name}
                            </span>
                          )}
                          {article.published_at && (
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                <Link
                  href={`/${featuredArticle.categories?.slug || 'news'}/${featuredArticle.slug}`}
                  prefetch
                  className="group order-1 lg:order-2 block rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  {featuredArticle.featured_image_url && (
                    <div className="relative aspect-[16/10] overflow-hidden rounded-[14px]">
                      <Image
                        src={featuredArticle.featured_image_url}
                        alt={featuredArticle.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        priority
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 60vw, 620px"
                      />
                    </div>
                  )}
                  <div className="pt-4 md:pt-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                      {featuredArticle.categories?.name || 'EkahNews Lead'}
                    </p>
                    <h4 className="mt-2 text-[24px] sm:text-[30px] md:text-[40px] font-bold leading-[1.06] tracking-tight text-slate-900 dark:text-white">
                      {featuredArticle.title}
                    </h4>
                    {featuredArticle.excerpt && (
                      <p className="mt-3 text-sm md:text-base leading-7 text-slate-600 dark:text-slate-400 line-clamp-3">
                        {featuredArticle.excerpt}
                      </p>
                    )}
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs md:text-sm text-slate-500 dark:text-slate-400">
                      {featuredArticle.authors?.name && (
                        <span className="inline-flex items-center gap-1.5">
                          <User className="h-4 w-4" />
                          {featuredArticle.authors.name}
                        </span>
                      )}
                      {featuredArticle.published_at && (
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {formatDistanceToNow(new Date(featuredArticle.published_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <div className="mt-4 inline-flex items-center gap-2 text-xs md:text-sm font-semibold uppercase tracking-[0.16em] text-slate-700 dark:text-slate-200">
                      Read Full Story
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>

                <div className="order-3 rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                      More From EkahNews
                    </p>
                  </div>
                  <div className="space-y-4">
                    {heroRightArticles.map((article, index) => (
                      <Link
                        key={article.id}
                        href={`/${article.categories?.slug || 'news'}/${article.slug}`}
                        className={`group block ${index !== 0 ? 'border-t border-slate-200 pt-4 dark:border-slate-800' : ''}`}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                          {article.categories?.name || 'News'}
                        </p>
                        <h5 className="mt-2 text-sm md:text-[15px] font-semibold leading-6 text-slate-900 dark:text-white line-clamp-3">
                          {article.title}
                        </h5>
                        {article.excerpt && (
                          <p className="mt-2 text-xs md:text-sm leading-6 text-slate-600 dark:text-slate-400 line-clamp-2">
                            {article.excerpt}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                          {article.authors?.name && <span>{article.authors.name}</span>}
                          {article.published_at && (
                            <span>{formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}</span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="w-full max-w-6xl mx-auto px-4 py-10 md:py-16">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_340px] gap-6 md:gap-8">
            <div className="space-y-8 md:space-y-10">
              {spotlightArticles.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Spotlight</p>
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-1">Editor&apos;s Picks</h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {spotlightArticles.map((article, index) => (
                      <Link key={article.id} href={`/${article.categories?.slug || 'news'}/${article.slug}`} className={`group ${index === 0 ? 'xl:col-span-2 xl:row-span-2' : ''}`}>
                        <article className="relative h-full min-h-[220px] sm:min-h-[240px] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                          {article.featured_image_url && (
                            <>
                              <Image
                                src={article.featured_image_url}
                                alt={article.title}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                                sizes={index === 0 ? '(max-width: 1280px) 100vw, 50vw' : '(max-width: 1280px) 50vw, 25vw'}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
                            </>
                          )}
                          <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 text-white">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75">
                              {article.categories?.name || 'News'}
                            </p>
                            <h3 className={`mt-2 font-bold leading-tight line-clamp-3 ${index === 0 ? 'text-xl sm:text-2xl md:text-3xl' : 'text-lg'}`}>
                              {article.title}
                            </h3>
                          </div>
                        </article>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Fresh Coverage</p>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-1">Latest News</h2>
                  </div>
                  <Link href="/search" className="hidden md:inline-flex text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                    Browse all stories
                  </Link>
                </div>

                {latestLeadArticles.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {latestLeadArticles.map((article) => (
                      <Link key={article.id} href={`/${article.categories?.slug || 'news'}/${article.slug}`} className="group">
                        <article className="h-full overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
                          {article.featured_image_url && (
                            <div className="relative aspect-[16/10] overflow-hidden">
                              <Image
                                src={article.featured_image_url}
                                alt={article.title}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                sizes="(max-width: 768px) 100vw, 50vw"
                              />
                            </div>
                          )}
                          <div className="p-4 md:p-5">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{article.categories?.name || 'News'}</Badge>
                            </div>
                            <h4 className="mt-3 md:mt-4 text-xl md:text-2xl font-bold leading-tight text-slate-900 dark:text-white line-clamp-3">
                              {article.title}
                            </h4>
                            {article.excerpt && (
                              <p className="mt-2 md:mt-3 text-sm md:text-base text-slate-600 dark:text-slate-400 line-clamp-2">
                                {article.excerpt}
                              </p>
                            )}
                            <div className="mt-3 md:mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 md:gap-x-4 text-xs md:text-sm text-slate-500 dark:text-slate-400">
                              {article.authors?.name && (
                                <span className="inline-flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5" />
                                  {article.authors.name}
                                </span>
                              )}
                              {article.published_at && (
                                <span className="inline-flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5" />
                                  {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
                                </span>
                              )}
                              <span>{calculateReadingTime(article.excerpt || article.title || '')} min read</span>
                            </div>
                          </div>
                        </article>
                      </Link>
                    ))}
                  </div>
                )}

                {latestFeedArticles.length > 0 ? (
                  <div className="space-y-5">
                    {latestFeedArticles.map((article) => (
                      <div key={article.id}>
                        <Link href={`/${article.categories?.slug || 'news'}/${article.slug}`}>
                          <Card className="overflow-hidden rounded-[22px] hover:shadow-lg transition-shadow cursor-pointer dark:bg-gray-800 dark:border-gray-700">
                            <div className="flex flex-col md:flex-row">
                              {article.featured_image_url && (
                                <div className="relative w-full aspect-[16/10] md:w-64 md:aspect-auto">
                                  <Image
                                    src={article.featured_image_url}
                                    alt={article.title}
                                    fill
                                    className="object-cover md:rounded-l-[22px] md:rounded-t-none"
                                    sizes="(max-width: 768px) 100vw, 256px"
                                  />
                                </div>
                              )}
                              <CardContent className="flex-1 p-4 md:p-6">
                                <div className="flex items-center gap-2 mb-3">
                                  {article.categories && (
                                    <Badge variant="secondary" className="dark:bg-gray-700">
                                      {article.categories.name}
                                    </Badge>
                                  )}
                                </div>
                                <h5 className="text-lg md:text-xl font-bold mb-2 dark:text-white leading-snug line-clamp-3">{article.title}</h5>
                                {article.excerpt && (
                                  <p className="mb-4 text-sm md:text-base text-gray-600 dark:text-gray-400 line-clamp-2">
                                    {article.excerpt}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                  {article.authors?.name && (
                                    <span className="inline-flex items-center gap-1.5">
                                      <User className="h-3.5 w-3.5" />
                                      {article.authors.name}
                                    </span>
                                  )}
                                  {article.published_at && (
                                    <span className="inline-flex items-center gap-1.5">
                                      <Calendar className="h-3.5 w-3.5" />
                                      {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
                                    </span>
                                  )}
                                </div>
                              </CardContent>
                            </div>
                          </Card>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>

              {homepageCategoryBlocks.length > 0 && (
                <section>
                  <div className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">News Desk</p>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-1">News by Category</h2>
                  </div>
                  <div className="space-y-10">
                    {homepageCategoryBlocks.map((block) => {
                      const [leadArticle, ...secondaryArticles] = block.articles
                      return (
                        <section key={block.id} className="rounded-[28px] border border-slate-200 bg-white p-4 md:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">{block.name}</h3>
                            <Link href={`/category/${block.slug}`} className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm hover:underline">
                              View All <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>

                          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-6">
                            {leadArticle && (
                              <Link href={`/${leadArticle.categories?.slug || 'news'}/${leadArticle.slug}`} className="group">
                                <article className="overflow-hidden rounded-[22px] border border-slate-200 dark:border-slate-800">
                                  {leadArticle.featured_image_url && (
                                    <div className="relative aspect-[16/10]">
                                      <Image
                                        src={leadArticle.featured_image_url}
                                        alt={leadArticle.title}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                        sizes="(max-width: 1280px) 100vw, 50vw"
                                      />
                                    </div>
                                  )}
                                  <div className="p-4 md:p-5">
                                    <h4 className="text-xl md:text-2xl font-bold leading-tight text-slate-900 dark:text-white line-clamp-3">
                                      {leadArticle.title}
                                    </h4>
                                    {leadArticle.excerpt && (
                                      <p className="mt-2 md:mt-3 text-sm md:text-base text-slate-600 dark:text-slate-400 line-clamp-2">
                                        {leadArticle.excerpt}
                                      </p>
                                    )}
                                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs md:text-sm text-slate-500 dark:text-slate-400">
                                      {leadArticle.authors?.name && (
                                        <span className="inline-flex items-center gap-1.5">
                                          <User className="h-3.5 w-3.5" />
                                          {leadArticle.authors.name}
                                        </span>
                                      )}
                                      {leadArticle.published_at && (
                                        <span className="inline-flex items-center gap-1.5">
                                          <Calendar className="h-3.5 w-3.5" />
                                          {formatDistanceToNow(new Date(leadArticle.published_at), { addSuffix: true })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </article>
                              </Link>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {secondaryArticles.map((article) => (
                                <ArticleMiniCard key={article.id} article={article} compact />
                              ))}
                            </div>
                          </div>
                        </section>
                      )
                    })}
                  </div>
                </section>
              )}

              {webStories.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Swipe Format</p>
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mt-1">Web Stories</h2>
                    </div>
                    <Link href="/web-stories" className="text-blue-600 dark:text-blue-400 hover:underline">View all</Link>
                  </div>
                  <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2">
                    {webStories.slice(0, 5).map((story) => (
                      <div key={story.id} className="min-w-[180px] max-w-[180px]">
                        <WebStoryCard story={story} />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="space-y-6">
              <Card className="dark:bg-gray-800 dark:border-gray-700 rounded-[24px]">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4 dark:text-white">Quick Briefs</h3>
                  <div className="space-y-4">
                    {quickTakeArticles.map((article) => (
                      <Link key={article.id} href={`/${article.categories?.slug || 'news'}/${article.slug}`} className="block group">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                          {article.categories?.name || 'News'}
                        </p>
                        <h4 className="mt-1 text-sm font-semibold leading-6 text-slate-900 dark:text-white">
                          {article.title}
                        </h4>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-gray-800 dark:border-gray-700 rounded-[24px]">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="h-5 w-5 text-orange-500" />
                    <h3 className="text-xl font-bold dark:text-white">Popular Now</h3>
                  </div>
                  <div className="space-y-4">
                    {sidebarSharedArticles.map((article, index) => (
                      <Link key={article.id} href={`/${article.categories?.slug || 'news'}/${article.slug}`} className="group flex gap-3">
                        <span className="text-sm font-semibold text-orange-500">{index + 1}</span>
                        <div className="min-w-0">
                          <h4 className="font-semibold leading-snug text-slate-900 dark:text-white">
                            {article.title}
                          </h4>
                          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {article.categories?.name || 'News'}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="dark:bg-gray-800 dark:border-gray-700 rounded-[24px]">
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

              {categoryHighlights.length > 0 && (
                <Card className="dark:bg-gray-800 dark:border-gray-700 rounded-[24px]">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-4 dark:text-white">Coverage Focus</h3>
                    <div className="space-y-5">
                      {categoryHighlights.map((block) => (
                        <Link key={block.id} href={`/category/${block.slug}`} className="block group">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                            Category
                          </p>
                          <h4 className="mt-1 text-base font-semibold leading-6 text-slate-900 dark:text-white">
                            {block.name}
                          </h4>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                            {block.articles?.[0]?.title || `Browse the latest coverage from ${block.name}.`}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </aside>
          </div>

        </div>

      </div>
    </>
  )
}
