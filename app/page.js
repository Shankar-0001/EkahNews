import { createOptionalPublicClient } from '@/lib/supabase/public-server'
import { Fragment } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Clock3 } from 'lucide-react'
import StructuredData, { OrganizationSchema, WebSiteSchema } from '@/components/seo/StructuredData'
import PublicHeader from '@/components/layout/PublicHeader'
import ContentUnavailableNotice from '@/components/common/ContentUnavailableNotice'
import SectionHeader from '@/components/home/SectionHeader'
import FeaturedArticle from '@/components/home/FeaturedArticle'
import SecondaryArticle from '@/components/home/SecondaryArticle'
import FeatureCard from '@/components/home/FeatureCard'
import MoreNewsSidebar from '@/components/home/MoreNewsSidebar'
import CryptoFeaturedBlock from '@/components/home/CryptoFeaturedBlock'
import HomeWebStoryRail from '@/components/home/HomeWebStoryRail'
import { getPublicationLogoUrl, SITE_URL } from '@/lib/site-config'
import { filterBlockedCategories } from '@/lib/category-utils'
import SchemaScript from '@/components/seo/SchemaScript'
import { runListQuery } from '@/lib/supabase/query-timeout'
import { formatArticleCardDate } from '@/lib/date-utils'

export const revalidate = 300

const HOMEPAGE_CATEGORY_LIMIT = 6
const CATEGORY_SECTION_ARTICLES = 3
const HOMEPAGE_CATEGORY_ALLOWLIST = [
  'cryptocurrency',
  'technology',
  'artificial-intelligence',
  'finance-markets',
  'science',
  'entertainment',
]
const CATEGORY_SLUG_ALIASES = {
  'tech-news': 'technology',
}
const FOR_YOU_CATEGORIES = [
  { label: 'Entertainment', sourceSlug: 'entertainment' },
  { label: 'Cryptocurrency', sourceSlug: 'cryptocurrency' },
  { label: 'Science', sourceSlug: 'science' },
  { label: 'Sports', sourceSlug: 'sports' },
  { label: 'Technology', sourceSlug: 'technology' },
]
const FOR_YOU_ARTICLES_PER_CATEGORY = 3
const HOMEPAGE_STACK_SECTIONS = [
  { key: 'crypto', title: 'Crypto', slugs: ['cryptocurrency'] },
  { key: 'market', title: 'Market', slugs: ['markets', 'finance-markets'] },
  { key: 'ai', title: 'AI', slugs: ['artificial-intelligence', 'ai'] },
  { key: 'technology', title: 'Technology', slugs: ['technology'] },
  { key: 'business', title: 'Business', slugs: ['business'] },
  { key: 'finance', title: 'Finance', slugs: ['finance', 'finance-markets', 'markets'] },
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

function CompactSectionFrame({ title, href, children }) {
  return (
    <section className="border border-[var(--c-border)] bg-[var(--c-card-bg)] p-[15px] dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-[var(--c-border)] pb-[15px] dark:border-slate-800/90">
        <h2 className="font-sans text-[30px] font-bold leading-none tracking-[-0.03em] text-[var(--c-heading)] dark:text-white">
          {title}
        </h2>
        {href ? (
          <Link
            href={href}
            className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 px-2 font-sans text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500 hover:text-[var(--c-accent)] dark:text-slate-400"
          >
            More
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
      <div className="pt-[15px]">{children}</div>
    </section>
  )
}

function StoryMeta({ article, compact = false }) {
  if (!article) return null

  return (
    <div className={`mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans ${compact ? 'text-[10px]' : 'text-[12px]'} font-semibold text-slate-500 dark:text-slate-400`}>
      {article.published_at && (
        <span className="inline-flex items-center gap-2">
          <Clock3 className="h-3 w-3 text-[var(--c-accent)] dark:text-slate-300" />
          {formatArticleCardDate(article.published_at)}
        </span>
      )}
      {article.authors?.name && <span>By {article.authors.name}</span>}
    </div>
  )
}

function normalizeHomepageCategorySlug(slug = '') {
  return CATEGORY_SLUG_ALIASES[slug] || slug
}

function StoryThumb({ article, className = '', sizes = '100px', icon = null }) {
  return (
    <div className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 ${className}`}>
      {article?.featured_image_url || article?.cover_image ? (
        <Image
          src={article.featured_image_url || article.cover_image}
          alt={article.title}
          fill
          className="object-cover"
          sizes={sizes}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400 dark:text-slate-500">
          img
        </div>
      )}
      {icon}
    </div>
  )
}

function TextHeadline({ article, href, className = '' }) {
  return (
    <Link href={href} className={`block font-title font-semibold leading-snug text-[var(--c-heading)] hover:underline hover:underline-offset-2 dark:text-white ${className}`}>
      {article.title}
    </Link>
  )
}

function getStoriesForSlugs(articles, slugs) {
  return articles.filter((article) => slugs.includes(article?.categories?.slug)).slice(0, 6)
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
      runListQuery(
        (signal) => supabase
          .from('articles')
          .select(`
          id,
          title,
          slug,
          excerpt,
          featured_image_url,
          published_at,
          authors (name),
          categories:categories!articles_category_id_fkey(name, slug)
        `)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(30)
        .abortSignal(signal),
        { label: 'fetchHomepageArticles' }
      ),
      runListQuery(
        (signal) => supabase
          .from('categories')
          .select('id, name, slug')
          .order('name')
          .abortSignal(signal),
        { label: 'fetchHomepageCategories' }
      ),
      runListQuery(
        (signal) => supabase
          .from('article_engagement')
          .select('article_id, views, likes, shares')
          .limit(30)
          .abortSignal(signal),
        { label: 'fetchHomepageEngagement' }
      ),
      runListQuery(
        (signal) => supabase
          .from('web_stories')
          .select('id, title, slug, cover_image, cover_image_alt, published_at, authors(name)')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(12)
          .abortSignal(signal),
        { label: 'fetchHomepageWebStories' }
      ),
      runListQuery(
        (signal) => supabase
          .from('articles')
          .select('id, category_id, published_at')
          .eq('status', 'published')
          .not('category_id', 'is', null)
          .order('published_at', { ascending: false })
          .abortSignal(signal),
        { label: 'fetchHomepageCategoryStats' }
      ),
    ])

    articles = articlesRes.data || []
    categories = filterBlockedCategories(categoriesRes.data || [])
    engagement = engagementRes.data || []
    webStories = storiesRes.data || []


    const categoryMetaById = new Map(categories.map((category) => [category.id, category]))
    const categoryMetaBySlug = new Map(categories.map((category) => [category.slug, category]))
    const categoryStats = new Map()
    const categoryIdGroups = new Map()

    for (const article of categoryStatsRes.data || []) {
      if (!article?.category_id) continue
      const rawCategory = categoryMetaById.get(article.category_id)
      const effectiveSlug = normalizeHomepageCategorySlug(rawCategory?.slug || '')
      const effectiveCategory = categoryMetaBySlug.get(effectiveSlug)

      if (!effectiveCategory) continue

      const existing = categoryStats.get(effectiveSlug) || {
        count: 0,
        latestPublishedAt: article.published_at || null,
      }

      categoryStats.set(effectiveSlug, {
        count: existing.count + 1,
        latestPublishedAt: existing.latestPublishedAt || article.published_at || null,
      })

      const ids = categoryIdGroups.get(effectiveSlug) || new Set()
      ids.add(article.category_id)
      categoryIdGroups.set(effectiveSlug, ids)
    }

    const showcaseCategoryIds = HOMEPAGE_CATEGORY_ALLOWLIST
      .filter((categorySlug) => categoryMetaBySlug.has(categorySlug) && (categoryStats.get(categorySlug)?.count || 0) > 0)
      .slice(0, HOMEPAGE_CATEGORY_LIMIT)

    if (showcaseCategoryIds.length > 0) {
      const rawCategoryIds = [...new Set(
        showcaseCategoryIds.flatMap((categorySlug) => [...(categoryIdGroups.get(categorySlug) || new Set())])
      )]

      const { data: showcaseArticles } = await runListQuery(
        (signal) => supabase
          .from('articles')
          .select(`
          id,
          title,
          slug,
          featured_image_url,
          published_at,
          category_id,
          authors (name),
          categories:categories!articles_category_id_fkey(name, slug)
        `)
        .eq('status', 'published')
        .in('category_id', rawCategoryIds)
        .order('published_at', { ascending: false })
        .abortSignal(signal),
        { label: 'fetchHomepageShowcaseArticles' }
      )

      const articlesByCategorySlug = new Map()

      for (const article of showcaseArticles || []) {
        const effectiveSlug = normalizeHomepageCategorySlug(article?.categories?.slug || '')
        if (!effectiveSlug) continue

        const items = articlesByCategorySlug.get(effectiveSlug) || []
        if (items.length < CATEGORY_SECTION_ARTICLES) {
          items.push(article)
          articlesByCategorySlug.set(effectiveSlug, items)
        }
      }

      categoryShowcases = showcaseCategoryIds
        .map((categorySlug) => {
          const category = categoryMetaBySlug.get(categorySlug)
          const items = articlesByCategorySlug.get(categorySlug) || []
          if (!category || items.length === 0) return null

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
      const { data: forYouArticles } = await runListQuery(
        (signal) => supabase
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
          categories:categories!articles_category_id_fkey(name, slug)
        `)
        .eq('status', 'published')
        .in('category_id', [...new Set(forYouConfigs.map((item) => item.categoryId))])
        .order('published_at', { ascending: false })
        .abortSignal(signal),
        { label: 'fetchHomepageForYouArticles' }
      )

      const articlesByCategoryId = new Map()

      for (const article of forYouArticles || []) {
        if (!article.category_id) continue
        const items = articlesByCategoryId.get(article.category_id) || []
        if (items.length < FOR_YOU_ARTICLES_PER_CATEGORY) {
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
  const featuredSidebarStories = articles.slice(1, 3)
  const latestGridStories = articles.slice(3, 7)
  const moreNewsArticles = articles
  const homepageLeadArticles = articles.slice(0, 10)
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Latest News - EkahNews',
    url: SITE_URL,
    numberOfItems: homepageLeadArticles.length,
    itemListElement: homepageLeadArticles.map((article, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE_URL}/${article.categories?.slug || 'news'}/${article.slug}`,
      name: article.title,
    })),
  }

  const homepageStackSections = HOMEPAGE_STACK_SECTIONS.map((section) => ({
    ...section,
    articles: getStoriesForSlugs(articles, section.slugs),
  })).filter((section) => section.articles.length > 0)
  const cryptoSection = homepageStackSections.find((section) => section.key === 'crypto') || null
  const remainingHomepageSections = homepageStackSections.filter((section) => section.key !== 'crypto')
  const latestNewsHref = '/latest-news'

  return (
    <>
      <StructuredData data={OrganizationSchema()} />
      <StructuredData data={WebSiteSchema()} />
      <SchemaScript schema={itemListSchema} />

      <div className="bg-[var(--c-page-bg)] dark:bg-slate-950">
        <PublicHeader categories={categories || []} />

        <main className="mx-auto w-full max-w-[var(--main-width)] px-[var(--wrap-padding)] py-[30px]">
          <h1 className="sr-only">EkahNews: Latest news and analysis</h1>
          {isMissingPublicConfig && process.env.NODE_ENV !== 'production' && (
            <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Homepage data is empty because `NEXT_PUBLIC_SUPABASE_URL` and/or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing.
              Add them to `.env.local` and restart the server.
            </section>
          )}
          {!articles.length && (
            <ContentUnavailableNotice
              className="my-8"
              title="Latest stories are temporarily unavailable"
              message="We are having trouble loading the homepage stories right now. Please refresh the page or check back shortly."
            />
          )}
          {(featuredArticle || cryptoSection) && (
            <section className="mb-6">
              <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,74.665%)_minmax(0,25%)]">
                <section className="border border-[var(--c-border)] bg-[var(--c-card-bg)] p-[15px] dark:border-slate-800 dark:bg-slate-900">
                  {featuredArticle ? (
                    <>
                      <SectionHeader title="Latest News" href={latestNewsHref} />
                      <div className="pt-3.5">
                        <div className="grid gap-5 md:grid-cols-[minmax(0,75.5%)_minmax(0,24.5%)]">
                          <FeaturedArticle article={featuredArticle} />
                          <div className="space-y-5">
                            {featuredSidebarStories.map((article) => (
                              <SecondaryArticle key={article.id} article={article} />
                            ))}
                          </div>
                        </div>

                        {latestGridStories.length > 0 ? (
                          <div className="mt-5 grid gap-5 md:grid-cols-3">
                            {latestGridStories.slice(0, 3).map((article) => (
                              <FeatureCard key={article.id} article={article} />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </>
                  ) : null}

                  {cryptoSection ? (
                    <div className={`${featuredArticle ? 'mt-[30px] border-t border-[var(--c-border)] pt-5 dark:border-slate-800' : ''}`}>
                      <SectionHeader title="Crypto" href="/category/cryptocurrency" />
                      <div className="pt-3.5">
                        <CryptoFeaturedBlock
                          article={cryptoSection.articles[0]}
                          relatedArticles={cryptoSection.articles.slice(1, 3)}
                        />
                      </div>
                    </div>
                  ) : null}
                </section>

                <div className="lg:sticky lg:top-6">
                  <MoreNewsSidebar articles={moreNewsArticles} />
                </div>
              </div>
            </section>
          )}
            <div className="space-y-[40px]">
            {remainingHomepageSections.map((section) => {
              const lead = section.articles[0]
              const side = section.articles.slice(1, 5)
              const bottom = section.articles.slice(1, 4)
              const sectionHref =
                section.key === 'market'
                  ? '/category/markets'
                  : section.key === 'finance'
                    ? '/search?q=Finance'
                    : `/category/${section.slugs[0]}`

              if (!lead) return null

              if (section.key === 'webstory') return null

              if (section.key === 'ai') {
                return (
                  <section key={section.key} className="bg-[var(--c-card-bg)] pt-1 dark:bg-slate-900">
                    <div className="border-b border-[#2f8dcc] pb-4">
                      <Link href={sectionHref} className="inline-block">
                        <h2 className="font-sans text-[30px] font-bold leading-none tracking-[-0.03em] text-[var(--c-heading)] hover:underline dark:text-white">
                          {section.title}
                        </h2>
                      </Link>
                    </div>
                    <article className="grid gap-5 border-b border-[var(--c-border)] py-5 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] lg:items-center dark:border-slate-800">
                      <Link href={getArticleHref(lead)} className="block">
                        <StoryThumb
                          article={lead}
                          className="aspect-[16/10] bg-black"
                          sizes="(max-width: 1023px) 100vw, 520px"
                        />
                      </Link>
                      <div>
                        <TextHeadline article={lead} href={getArticleHref(lead)} className="text-[19px] font-bold" />
                        <StoryMeta article={lead} compact />
                        {lead.excerpt ? (
                          <p className="mt-4 font-body text-[12.5px] font-medium leading-[1.6] text-[var(--c-muted)] line-clamp-3 dark:text-slate-400">
                            {lead.excerpt}
                          </p>
                        ) : null}
                      </div>
                    </article>
                  </section>
                )
              }

              if (section.key === 'technology') {
                const topSideArticle = section.articles[1]
                const listArticles = section.articles.slice(0, 3)
                const cardArticles = section.articles.slice(3, 5)

                return (
                  <section key={section.key} className="bg-[var(--c-card-bg)] dark:bg-slate-900 p-4">
                    <SectionHeader title={section.title} href={sectionHref} />

                    <div className="grid gap-4 py-5 lg:grid-cols-[minmax(0,0.32fr)_minmax(0,0.43fr)_minmax(0,0.25fr)]">
                      <article className="self-center">
                        {lead.categories?.name ? (
                          <p className="mb-3 font-sans text-[11px] font-bold text-[var(--c-accent)]">
                            {lead.categories.name}
                          </p>
                        ) : null}
                        <TextHeadline article={lead} href={getArticleHref(lead)} className="text-[19px] font-bold" />
                        <StoryMeta article={lead} compact />
                        {lead.excerpt ? (
                          <p className="mt-4 font-body text-[12.5px] font-medium leading-[1.65] text-[var(--c-muted)] line-clamp-4 dark:text-slate-400">
                            {lead.excerpt}
                          </p>
                        ) : null}
                      </article>

                      <Link href={getArticleHref(lead)} className="block">
                        <StoryThumb
                          article={lead}
                          className="aspect-[16/10] bg-black"
                          sizes="(max-width: 1023px) 100vw, 520px"
                        />
                      </Link>

                      {topSideArticle ? (
                        <article className="bg-[#f6f8fa] dark:bg-slate-800">
                          <Link href={getArticleHref(topSideArticle)} className="block">
                            <StoryThumb
                              article={topSideArticle}
                              className="aspect-[16/10] bg-black"
                              sizes="(max-width: 1023px) 100vw, 300px"
                            />
                            <h3 className="px-3 py-4 font-title text-[14px] font-bold leading-snug text-[var(--c-heading)] hover:underline dark:text-white">
                              {topSideArticle.title}
                            </h3>
                          </Link>
                        </article>
                      ) : null}
                    </div>

                    <div className="grid gap-5 border-t border-[var(--c-border)] pt-5 md:grid-cols-[minmax(0,0.49fr)_minmax(0,0.51fr)] dark:border-slate-800">
                      <div className="space-y-[2px]">
                        {listArticles.map((article) => (
                          <Link
                            key={article.id}
                            href={getArticleHref(article)}
                            className="grid grid-cols-[126px_1fr] gap-3"
                          >
                            <StoryThumb article={article} className="h-[86px] w-[126px]" sizes="126px" />
                            <div className="flex min-w-0 items-center pr-2">
                              <p className="font-title text-[13px] font-semibold leading-snug text-[var(--c-heading)] line-clamp-3 dark:text-white">
                                {article.title}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>

                      <div className="grid gap-5 sm:grid-cols-2">
                        {cardArticles.map((article) => (
                          <article key={article.id}>
                            <Link href={getArticleHref(article)} className="block">
                              <StoryThumb article={article} className="aspect-[16/10] bg-black" sizes="260px" />
                              <h3 className="mt-3 font-title text-[14px] font-bold leading-snug text-[var(--c-heading)] hover:underline dark:text-white">
                                {article.title}
                              </h3>
                            </Link>
                            {article.excerpt ? (
                              <p className="mt-2 font-body text-[12.5px] font-medium leading-[1.6] text-[var(--c-muted)] line-clamp-3 dark:text-slate-400">
                                {article.excerpt}
                              </p>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    </div>
                  </section>
                )
              }

              const sectionNode = (
                <CompactSectionFrame key={section.key} title={section.title} href={sectionHref}>
                  {section.key === 'market' ? (
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_300px]">
                      <article>
                        <Link href={getArticleHref(lead)} className="block">
                          <StoryThumb article={lead} className="aspect-[16/9] bg-black" sizes="(max-width: 1023px) 100vw, 760px" />
                        </Link>
                        <Link href={getArticleHref(lead)} className="mt-3 block">
                          <h3 className="font-title text-[24px] font-bold leading-tight tracking-[-0.01em] text-[var(--c-heading)] hover:underline dark:text-white">
                            {lead.title}
                          </h3>
                        </Link>
                        <StoryMeta article={lead} compact />
                        {lead.excerpt ? (
                          <p className="mt-2 font-body text-[12.5px] font-medium leading-[1.6] text-[var(--c-muted)] line-clamp-3 dark:text-slate-400">
                            {lead.excerpt}
                          </p>
                        ) : null}
                      </article>
                      <div className="space-y-[10px]">
                        {side.map((article) => (
                          <Link
                            key={article.id}
                            href={getArticleHref(article)}
                            className="grid grid-cols-[86px_1fr] gap-3 border-b border-[var(--c-border)] pb-[10px] last:border-b-0 dark:border-slate-800"
                          >
                            <StoryThumb article={article} className="h-[54px] w-[86px]" sizes="86px" />
                            <div className="min-w-0">
                              <p className="font-title text-[13px] font-semibold leading-snug text-[var(--c-heading)] line-clamp-3 dark:text-white">
                                {article.title}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : section.key === 'entertainment' ? (
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_300px]">
                      <Link href={getArticleHref(lead)} className="block">
                        <div className="relative aspect-[16/9] overflow-hidden bg-black">
                          <StoryThumb article={lead} className="h-full w-full" sizes="(max-width: 1023px) 100vw, 760px" />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-4">
                            <h3 className="font-title text-[24px] font-bold leading-tight tracking-[-0.01em] text-white">
                              {lead.title}
                            </h3>
                          </div>
                        </div>
                      </Link>
                      <div className="space-y-[10px]">
                        {side.map((article) => (
                          <Link
                            key={article.id}
                            href={getArticleHref(article)}
                            className="grid grid-cols-[86px_1fr] gap-3 border-b border-[var(--c-border)] pb-[10px] last:border-b-0 dark:border-slate-800"
                          >
                            <StoryThumb article={article} className="h-[54px] w-[86px]" sizes="86px" />
                            <div className="min-w-0">
                              <p className="font-title text-[13px] font-semibold leading-snug text-[var(--c-heading)] line-clamp-3 dark:text-white">
                                {article.title}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                        <div className={section.key === 'business' ? 'space-y-[20px] lg:flex lg:h-full lg:flex-col lg:justify-center' : 'space-y-[20px]'}>
                          <div>
                            <TextHeadline article={lead} href={getArticleHref(lead)} className="text-[19px] font-bold" />
                            <StoryMeta article={lead} compact />
                            {lead.excerpt ? (
                              <p className="mt-2 font-body text-[12.5px] font-medium leading-[1.6] text-[var(--c-muted)] line-clamp-4 dark:text-slate-400">
                                {lead.excerpt}
                              </p>
                            ) : null}
                          </div>
                          {section.articles.slice(1, 3).map((article) => (
                            <div key={article.id} className="border-t border-[var(--c-border)] pt-[10px] dark:border-slate-800">
                              <TextHeadline article={article} href={getArticleHref(article)} className="text-[13px]" />
                              <StoryMeta article={article} compact />
                            </div>
                          ))}
                        </div>
                        <StoryThumb article={lead} className="aspect-[16/10]" sizes="(max-width: 1023px) 100vw, 560px" />
                      </div>

                      {bottom.length > 0 && (
                        <div className="mt-5 grid gap-5 md:grid-cols-3">
                          {bottom.map((article) => (
                            <Link key={article.id} href={getArticleHref(article)} className="block border-t border-[var(--c-border)] pt-[10px] dark:border-slate-800">
                              <p className="font-title text-[13px] font-semibold leading-snug text-[var(--c-heading)] line-clamp-3 dark:text-white">
                                {article.title}
                              </p>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CompactSectionFrame>
              )

              if (section.key === 'business' && webStories.length > 0) {
                return (
                  <Fragment key="webstory-before-business">
                    <CompactSectionFrame title="Webstory" href="/web-stories">
                      <HomeWebStoryRail stories={webStories} />
                    </CompactSectionFrame>
                    {sectionNode}
                  </Fragment>
                )
              }

              return sectionNode
            })}
          </div>
        </main>
      </div>
    </>
  )
}
