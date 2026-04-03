import { createOptionalPublicClient } from '@/lib/supabase/public-server'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Clock3, TrendingUp, User } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import StructuredData, { OrganizationSchema, WebSiteSchema } from '@/components/seo/StructuredData'
import PublicHeader from '@/components/layout/PublicHeader'
import ArticleMiniCard from '@/components/content/ArticleMiniCard'
import WebStoriesRail from '@/components/home/WebStoriesRail'
import { getPublicationLogoUrl, SITE_URL } from '@/lib/site-config'

export const revalidate = 600

const HOMEPAGE_CATEGORY_LIMIT = 6
const CATEGORY_SECTION_LIMIT = 6
const CATEGORY_SECTION_ARTICLES = 3
const FOR_YOU_CATEGORIES = [
  { label: 'Entertainment', sourceSlug: 'entertainment' },
  { label: 'Cryptocurrency', sourceSlug: 'cryptocurrency' },
  { label: 'Science', sourceSlug: 'science' },
  { label: 'Sports', sourceSlug: 'sports' },
  { label: 'Tech News', sourceSlug: 'technology' },
  { label: 'Technology', sourceSlug: 'technology' },
]

const siteUrl = SITE_URL
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

function getArticleHref(article) {
  return `/${article.categories?.slug || 'news'}/${article.slug}`
}

function SectionHeading({ kicker, title, href, hrefLabel = 'Load More' }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
          {kicker}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white md:text-3xl">
          {title}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#d62828] hover:underline dark:text-red-400"
        >
          {hrefLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}

function HeroMeta({ article, light = false }) {
  if (!article) return null

  const metaTextClass = light ? 'text-white/90' : 'text-slate-500 dark:text-slate-400'
  const iconClass = light ? 'text-red-300' : 'text-[#d62828] dark:text-red-400'

  return (
    <div className={`mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs md:text-sm ${metaTextClass}`}>
      {article.categories?.name && (
        <span className="inline-flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${light ? 'bg-red-300' : 'bg-[#d62828]'}`} />
          {article.categories.name}
        </span>
      )}
      {article.authors?.name && (
        <span className="inline-flex items-center gap-2">
          <User className={`h-4 w-4 ${iconClass}`} />
          {article.authors.name}
        </span>
      )}
      {article.published_at && (
        <span className="inline-flex items-center gap-2">
          <Clock3 className={`h-4 w-4 ${iconClass}`} />
          {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
        </span>
      )}
    </div>
  )
}

function getAdaptiveHeadlineClass(title = '', {
  shortClass,
  mediumClass,
  longClass,
}) {
  const length = (title || '').trim().length

  if (length > 95) return longClass
  if (length > 60) return mediumClass
  return shortClass
}

export default async function HomePage() {
  const supabase = createOptionalPublicClient()
  const isMissingPublicConfig = !supabase
  let articles = []
  let categories = []
  let engagement = []
  let webStories = []
  let categoryShowcases = []
  let forYouCards = []

  if (supabase) {
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
        .limit(30),
      supabase
        .from('categories')
        .select('id, name, slug')
        .order('name'),
      supabase
        .from('article_engagement')
        .select('article_id, views, likes, shares')
        .limit(30),
      supabase
        .from('web_stories')
        .select('id, title, slug, cover_image, cover_image_alt, published_at, authors(name)')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(12),
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
    const categoryMetaBySlug = new Map((categoriesRes.data || []).map((category) => [category.slug, category]))
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

    const showcaseCategoryIds = [...categoryStats.entries()]
      .filter(([categoryId, stats]) => categoryMetaById.has(categoryId) && stats.count >= CATEGORY_SECTION_ARTICLES)
      .sort((a, b) => {
        const dateA = new Date(a[1].latestPublishedAt || 0).getTime()
        const dateB = new Date(b[1].latestPublishedAt || 0).getTime()
        if (dateB !== dateA) return dateB - dateA
        return (categoryMetaById.get(a[0])?.name || '').localeCompare(categoryMetaById.get(b[0])?.name || '')
      })
      .slice(0, CATEGORY_SECTION_LIMIT)
      .map(([categoryId]) => categoryId)

    if (showcaseCategoryIds.length > 0) {
      const { data: showcaseArticles } = await supabase
        .from('articles')
        .select(`
          id,
          title,
          slug,
          featured_image_url,
          published_at,
          category_id,
          authors (name),
          categories (name, slug)
        `)
        .eq('status', 'published')
        .in('category_id', showcaseCategoryIds)
        .order('published_at', { ascending: false })

      const articlesByCategoryId = new Map()

      for (const article of showcaseArticles || []) {
        if (!article?.category_id) continue

        const items = articlesByCategoryId.get(article.category_id) || []
        if (items.length < CATEGORY_SECTION_ARTICLES) {
          items.push(article)
          articlesByCategoryId.set(article.category_id, items)
        }
      }

      categoryShowcases = showcaseCategoryIds
        .map((categoryId) => {
          const category = categoryMetaById.get(categoryId)
          const items = articlesByCategoryId.get(categoryId) || []
          if (!category || items.length < CATEGORY_SECTION_ARTICLES) return null

          return {
            ...category,
            articles: items,
          }
        })
        .filter(Boolean)
    }

    const forYouConfigs = FOR_YOU_CATEGORIES
      .map((item) => ({
        ...item,
        categoryId: categoryMetaBySlug.get(item.sourceSlug)?.id,
      }))
      .filter((item) => item.categoryId)

    if (forYouConfigs.length > 0) {
      const { data: forYouArticles } = await supabase
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
        .in('category_id', [...new Set(forYouConfigs.map((item) => item.categoryId))])
        .order('published_at', { ascending: false })

      const articlesByCategoryId = new Map()

      for (const article of forYouArticles || []) {
        if (!article.category_id) continue
        const items = articlesByCategoryId.get(article.category_id) || []
        if (items.length < 2) {
          items.push(article)
          articlesByCategoryId.set(article.category_id, items)
        }
      }

      forYouCards = FOR_YOU_CATEGORIES.map((item) => ({
        ...item,
        category: categoryMetaBySlug.get(item.sourceSlug) || null,
        articles: item.sourceSlug
          ? (articlesByCategoryId.get(categoryMetaBySlug.get(item.sourceSlug)?.id) || [])
          : [],
      })).filter((item) => item.articles.length > 0)
    }
    } catch (error) {
      console.error('Homepage data fetch failed:', error)
    }
  }

  const featuredArticle = articles[0]
  const featuredSidebarStories = articles.slice(1, 5)
  const moreNewsArticles = articles.slice(19, 31)

  const engagementMap = new Map((engagement || []).map((row) => [row.article_id, row]))
  const mostShared = [...articles]
    .map((article) => ({
      ...article,
      _shares: engagementMap.get(article.id)?.shares || 0,
    }))
    .sort((a, b) => b._shares - a._shares)
    .slice(0, 5)

  return (
    <>
      <StructuredData data={OrganizationSchema()} />
      <StructuredData data={WebSiteSchema()} />

      <div className="bg-[#f8fafc] dark:bg-slate-950">
        <PublicHeader categories={categories || []} />

        <main className="w-full max-w-6xl mx-auto px-4 py-8 md:py-10">
          {isMissingPublicConfig && process.env.NODE_ENV !== 'production' && (
            <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Homepage data is empty because `NEXT_PUBLIC_SUPABASE_URL` and/or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing.
              Add them to `.env.local` and restart the server.
            </section>
          )}
          {featuredArticle && (
            <section className="mb-10">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.95fr)] lg:items-start">
                <div className="space-y-3">
                  <Link
                    href={getArticleHref(featuredArticle)}
                    className="group block overflow-hidden"
                  >
                    <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800 sm:aspect-[16/9] lg:aspect-[16/10]">
                      {featuredArticle.featured_image_url ? (
                        <Image
                          src={featuredArticle.featured_image_url}
                          alt={featuredArticle.title}
                          fill
                          priority
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                          sizes="(max-width: 1023px) 100vw, (max-width: 1280px) 60vw, 62vw"
                        />
                      ) : (
                        <div className="h-full w-full" aria-hidden="true" />
                      )}
                    </div>
                  </Link>

                  <Link
                    href={getArticleHref(featuredArticle)}
                    className="group block px-1 py-2 transition-colors"
                  >
                    <h1 className="text-[1.3rem] font-extrabold leading-tight tracking-tight text-slate-900 line-clamp-3 group-hover:underline group-hover:underline-offset-4 dark:text-white sm:text-[1.5rem] md:text-[1.75rem] lg:text-[1.9rem]">
                      {featuredArticle.title}
                    </h1>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                      {featuredArticle.published_at && (
                        <span>{formatDistanceToNow(new Date(featuredArticle.published_at), { addSuffix: true })}</span>
                      )}
                      {featuredArticle.authors?.name && (
                        <span>by {featuredArticle.authors.name}</span>
                      )}
                    </div>
                  </Link>
                </div>

                <div className="p-1 lg:pt-0">
                  <div className="mb-3 flex items-center gap-2 px-2 text-xs font-bold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-300 sm:px-2.5 lg:px-2">
                    <Clock3 className="h-3.5 w-3.5 text-[#d62828] dark:text-red-400" />
                    <span>Latest News</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    {featuredSidebarStories.map((article) => (
                      <Link
                        key={article.id}
                        href={getArticleHref(article)}
                        className="group grid min-w-0 grid-cols-[minmax(0,1fr)_72px] items-center gap-2 p-2 sm:grid-cols-[minmax(0,1fr)_80px] sm:p-2.5 lg:grid-cols-[minmax(0,1fr)_88px]"
                      >
                        <div className="min-w-0">
                          <p className="break-words text-[0.92rem] font-medium leading-snug text-slate-900 decoration-current underline-offset-4 group-hover:underline dark:text-white sm:text-[0.98rem]">
                              {article.title}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                            {article.published_at && (
                              <span>{formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}</span>
                            )}
                            {article.authors?.name && (
                              <span>by {article.authors.name}</span>
                            )}
                          </div>
                        </div>

                        <div className="relative h-[72px] w-[72px] overflow-hidden bg-slate-100 dark:bg-slate-800 sm:h-[80px] sm:w-[80px] lg:h-[88px] lg:w-[88px]">
                          {article.featured_image_url ? (
                            <Image
                              src={article.featured_image_url}
                              alt={article.title}
                              fill
                              className="object-cover"
                              sizes="(max-width: 639px) 72px, (max-width: 1023px) 80px, 88px"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs font-medium text-slate-400 dark:text-slate-500">
                              img
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-center">
                <Link
                  href="/latest-news"
                  className="inline-flex items-center justify-center border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:border-[#b4235a] hover:text-[#b4235a] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-[#d94b7d] dark:hover:text-[#d94b7d]"
                >
                  Read More
                </Link>
              </div>
              <div className="mt-8" />
            </section>
          )}

          <section className="mb-10">
            <div className="mb-4 flex items-center gap-4">
              <div className="h-[2px] flex-1 bg-slate-300 dark:bg-slate-700" />
              <p className="text-[1.2rem] font-bold tracking-tight text-slate-900 dark:text-white">
                For You
              </p>
              <div className="h-[2px] flex-1 bg-slate-300 dark:bg-slate-700" />
            </div>

            <div className="grid w-full gap-3 xl:grid-cols-[minmax(0,1.42fr)_minmax(260px,0.58fr)] xl:items-stretch">
              {forYouCards.length > 0 && (
                <div className="h-full overflow-hidden border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="grid h-full md:grid-cols-2 md:divide-x md:divide-slate-200 dark:md:divide-slate-800">
                    {forYouCards.map((item, index) => {
                      const isLastRow = index >= forYouCards.length - 2

                      return (
                        <div
                          key={`${item.label}-${index}`}
                          className={`${!isLastRow ? 'border-b border-slate-200 dark:border-slate-800' : ''} py-2 ${index % 2 === 0 ? 'md:pr-3' : 'md:pl-3'}`}
                        >
                          <div className="min-w-0">
                            <Link
                              href={`/category/${item.category?.slug || item.sourceSlug}`}
                              className="inline-block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 hover:underline dark:text-slate-400"
                            >
                              {item.label}
                            </Link>

                            <div className="mt-1 space-y-2">
                              {item.articles.map((article, articleIndex) => (
                                <div
                                  key={article.id}
                                  className={articleIndex > 0 ? 'border-t border-slate-200 pt-2 dark:border-slate-800' : ''}
                                >
                                  <div className="grid grid-cols-[minmax(0,1fr)_62px] gap-2 sm:grid-cols-[minmax(0,1fr)_68px]">
                                    <div className="min-w-0">
                                      <p className="text-[0.92rem] font-medium leading-snug text-slate-900 dark:text-white">
                                        <Link
                                          href={getArticleHref(article)}
                                          className="hover:underline hover:underline-offset-4"
                                        >
                                          {article.title}
                                        </Link>
                                      </p>
                                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                                        {article.published_at && (
                                          <span>{formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}</span>
                                        )}
                                        {article.authors?.name && (
                                          <span>By {article.authors.name}</span>
                                        )}
                                      </div>
                                    </div>

                                    <Link
                                      href={getArticleHref(article)}
                                      className="relative block h-[62px] w-[62px] overflow-hidden bg-slate-100 dark:bg-slate-800 sm:h-[68px] sm:w-[68px]"
                                    >
                                      {article.featured_image_url ? (
                                        <Image
                                          src={article.featured_image_url}
                                          alt={article.title}
                                          fill
                                          className="object-cover"
                                          sizes="(max-width: 639px) 62px, 68px"
                                        />
                                      ) : (
                                        <div className="flex h-full items-center justify-center text-[10px] text-slate-400 dark:text-slate-500">
                                          img
                                        </div>
                                      )}
                                    </Link>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <aside className="h-full border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#d62828]" />
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                    Popular Now
                  </p>
                </div>
                <div className="mt-3 space-y-2">
                  {mostShared.map((article, index) => (
                    <Link
                      key={article.id}
                      href={getArticleHref(article)}
                      className="group flex gap-2 p-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <span className="mt-1 text-lg font-black text-slate-300 dark:text-slate-600">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                          {article.categories?.name || 'News'}
                        </p>
                        <h3 className="mt-1 text-sm font-semibold leading-6 text-slate-900 line-clamp-3 dark:text-white">
                          <span className="group-hover:underline group-hover:underline-offset-4">
                            {article.title}
                          </span>
                        </h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </aside>
            </div>
          </section>

          {webStories.length > 0 && (
            <section className="mb-10">
              <div className="mb-4 flex items-center gap-4">
                <div className="h-[2px] flex-1 bg-slate-300 dark:bg-slate-700" />
                <p className="text-[1.2rem] font-bold tracking-tight text-slate-900 dark:text-white">
                  Web Stories
                </p>
                <div className="h-[2px] flex-1 bg-slate-300 dark:bg-slate-700" />
              </div>
              <WebStoriesRail stories={webStories} />
              <div className="mt-4 flex justify-center">
                <Link
                  href="/web-stories"
                  className="inline-flex items-center justify-center border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:border-[#b4235a] hover:text-[#b4235a] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-[#d94b7d] dark:hover:text-[#d94b7d]"
                >
                  Read More
                </Link>
              </div>
            </section>
          )}

          <section className="mb-10">
            <div className="mb-4 flex items-center gap-4">
              <div className="h-[2px] flex-1 bg-slate-300 dark:bg-slate-700" />
              <p className="text-[1.2rem] font-bold tracking-tight text-slate-900 dark:text-white">
                Categories
              </p>
              <div className="h-[2px] flex-1 bg-slate-300 dark:bg-slate-700" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {categoryShowcases.map((categoryBlock) => (
                <section
                  key={categoryBlock.id}
                  className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="px-4 pt-4 pb-3">
                    <Link
                      href={"/category/" + categoryBlock.slug}
                      className="inline-flex items-center gap-1 text-lg font-bold text-slate-900 hover:text-[#b4235a] dark:text-white dark:hover:text-[#d94b7d]"
                    >
                      {categoryBlock.name}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="border-t border-slate-200 dark:border-slate-800">
                    {categoryBlock.articles.map((article, index) => (
                      <Link
                        key={article.id}
                        href={getArticleHref(article)}
                        className={
                          "grid grid-cols-[minmax(0,1fr)_72px] gap-3 px-4 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 " +
                          (index < categoryBlock.articles.length - 1 ? 'border-b border-slate-200 dark:border-slate-800' : '')
                        }
                      >
                        <div className="min-w-0">
                          <p className="line-clamp-3 text-[15px] font-semibold leading-snug text-slate-900 dark:text-white">
                            {article.title}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                            {article.published_at && (
                              <span>{formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}</span>
                            )}
                            {article.authors?.name && (
                              <span>By {article.authors.name}</span>
                            )}
                          </div>
                        </div>

                        <div className="relative h-[72px] w-[72px] overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                          {article.featured_image_url ? (
                            <Image
                              src={article.featured_image_url}
                              alt={article.title}
                              fill
                              className="object-cover"
                              sizes="72px"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] font-medium text-slate-400 dark:text-slate-500">
                              img
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>

          {moreNewsArticles.length > 0 && (
            <section className="pb-4">
              <SectionHeading
                kicker="More Coverage"
                title="More News"
              />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {moreNewsArticles.map((article, index) => (
                  <ArticleMiniCard
                    key={article.id}
                    article={article}
                    compact
                    hideExcerpt={index > 3}
                  />
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  )
}

