import { createOptionalPublicClient } from '@/lib/supabase/public-server'
import { notFound, permanentRedirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, Clock } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import Image from 'next/image'
import PublicHeader from '@/components/layout/PublicHeader'
import StructuredData from '@/components/seo/StructuredData'
import { SidebarAd } from '@/components/ads/AdComponent'
import { buildArticleImageVariants, generateArticleSchemas } from '@/lib/seo-utils'
import { calculateReadingTime, generateSixtySecondSummary } from '@/lib/content-utils'
import ReadingProgressBar from '@/components/article/ReadingProgressBar'
import ArticleSummaryToggles from '@/components/article/ArticleSummaryToggles'
import ArticleFollowStrip from '@/components/article/ArticleFollowStrip'
import ContinuousReader from '@/components/article/ContinuousReader'
import DynamicRelatedSidebar from '@/components/article/DynamicRelatedSidebar'
import Breadcrumb from '@/components/common/Breadcrumb'
import SafeHtml from '@/components/SafeHtml'
import { getArticleCanonicalUrl, SITE_URL, slugFromText } from '@/lib/site-config'
import { buildArticleKeywords, keywordsToMetadataValue } from '@/lib/keywords'
import { parseStructuredDataOverride } from '@/lib/seo-utils'
import SchemaScript from '@/components/seo/SchemaScript'
import { getBreadcrumbSchema, getFAQSchema, getNewsArticleSchema, getSpeakableSchema } from '@/lib/schema'
import { filterBlockedCategories } from '@/lib/category-utils'
import { runListQuery, runSingleQuery } from '@/lib/supabase/query-timeout'
import { getAdSlotIds, hasRenderableAdSlot } from '@/lib/ads'

export const revalidate = 1800

const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`
const ARTICLE_METADATA_SELECT = `
        id,
        title,
        slug,
        excerpt,
        seo_title,
        seo_description,
        featured_image_url,
        featured_image_alt,
        og_image,
        keywords,
        canonical_url,
        schema_type,
        structured_data,
        published_at,
        updated_at,
        status,
        category_id,
        author_id,
        authors (id, name, slug),
        categories (name, slug),
        article_tags (tags (name, slug))
      `
const ARTICLE_METADATA_SELECT_FALLBACK = ARTICLE_METADATA_SELECT.replace('        og_image,\n', '')
const ARTICLE_PAGE_SELECT = `
        id,
        title,
        slug,
        excerpt,
        content,
        content_json,
        featured_image_url,
        featured_image_alt,
        og_image,
        keywords,
        canonical_url,
        schema_type,
        structured_data,
        published_at,
        updated_at,
        status,
        category_id,
        author_id,
        authors (id, slug, name, bio, avatar_url),
        categories (name, slug),
        article_tags (tags (id, name, slug))
      `
const ARTICLE_PAGE_SELECT_FALLBACK = ARTICLE_PAGE_SELECT.replace('        og_image,\n', '')

function isMissingOgImageColumnError(error) {
  const message = error?.message || ''
  return typeof message === 'string'
    && message.includes('og_image')
    && message.toLowerCase().includes('column')
}

export async function generateStaticParams() {
  const supabase = createOptionalPublicClient()
  if (!supabase) {
    return []
  }

  const { data: articles } = await runListQuery(
    (signal) => supabase
      .from('articles')
      .select('slug, categories(slug)')
      .eq('status', 'published')
      .limit(10)
      .abortSignal(signal),
    { label: 'generateStaticParams:articles' }
  )

  return articles?.map((article) => ({
    categorySlug: article.categories?.slug || 'news',
    articleSlug: article.slug,
  })) || []
}

export async function generateMetadata({ params }) {
  try {
    const supabase = createOptionalPublicClient()
    if (!supabase) {
      return {
        title: 'Article - EkahNews',
        robots: { index: false, follow: false },
      }
    }

    const { articleSlug } = params

    let article
    try {
      article = await runSingleQuery(
        (signal) => supabase
          .from('articles')
          .select(ARTICLE_METADATA_SELECT)
          .eq('slug', articleSlug)
          .eq('status', 'published')
          .maybeSingle()
          .abortSignal(signal),
        { label: 'generateMetadata:getArticleBySlug' }
      )
    } catch (error) {
      if (!isMissingOgImageColumnError(error)) {
        throw error
      }

      article = await runSingleQuery(
        (signal) => supabase
          .from('articles')
          .select(ARTICLE_METADATA_SELECT_FALLBACK)
          .eq('slug', articleSlug)
          .eq('status', 'published')
          .maybeSingle()
          .abortSignal(signal),
        { label: 'generateMetadata:getArticleBySlug:fallback' }
      )
    }

    if (!article) {
      return {
        title: 'Article Not Found',
      }
    }

    const ogImage = article.og_image || article.featured_image_url || DEFAULT_OG_IMAGE
    let metadataImageMeta = null
    if (ogImage) {
      metadataImageMeta = await runSingleQuery(
        (signal) => supabase
          .from('media_library')
          .select('original_width, original_height')
          .eq('file_url', ogImage)
          .maybeSingle()
          .abortSignal(signal),
        { label: 'generateMetadata:getArticleImageMeta' }
      )
    }

    const articleForMetadata = {
      ...article,
      featured_image_url: ogImage,
      featured_image_width: metadataImageMeta?.original_width || null,
      featured_image_height: metadataImageMeta?.original_height || null,
    }

    const siteUrl = SITE_URL
    const articleUrl = getArticleCanonicalUrl(article)
    const keywords = buildArticleKeywords(article)
    const authorLinkSlug = article.authors?.slug
      || article.authors?.id
      || article.author_id
      || slugFromText(article.authors?.name || '')

    return {
      title: article.seo_title || article.title,
      description: article.seo_description || article.excerpt || article.title,
      keywords: keywordsToMetadataValue(keywords),
      authors: article.authors ? [{ name: article.authors.name, url: `${siteUrl}/authors/${authorLinkSlug}` }] : [],
      openGraph: {
        title: article.seo_title || article.title,
        description: article.seo_description || article.excerpt || article.title,
        type: 'article',
        section: article.categories?.name || params.categorySlug,
        publishedTime: article.published_at,
        modifiedTime: article.updated_at || article.published_at,
        authors: article.authors?.name ? [article.authors.name] : [],
        images: buildArticleImageVariants(articleForMetadata).map((image) => ({
          url: image.url,
          width: image.width,
          height: image.height,
          alt: image.caption,
        })),
        url: articleUrl,
      },
      twitter: {
        card: 'summary_large_image',
        title: article.seo_title || article.title,
        description: article.seo_description || article.excerpt || article.title,
        images: buildArticleImageVariants(articleForMetadata).map((image) => image.url),
      },
      alternates: {
        canonical: articleUrl,
        languages: {
          en: articleUrl,
          'x-default': articleUrl,
        },
      },
      robots: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    }
  } catch {
    return {
      title: 'Article - EkahNews',
    }
  }
}

export default async function ArticlePage({ params }) {
  const supabase = createOptionalPublicClient()
  if (!supabase) {
    notFound()
  }

  const { categorySlug, articleSlug } = params
  const siteUrl = SITE_URL
  const isBuildTime = process.env.npm_lifecycle_event === 'build'
  const adSlots = getAdSlotIds()
  const shouldRenderSidebarAd = hasRenderableAdSlot(adSlots.sidebar)

  let article
  let isDatabaseUnavailable = false
  try {
    article = await runSingleQuery(
      (signal) => supabase
        .from('articles')
        .select(ARTICLE_PAGE_SELECT)
      .eq('slug', articleSlug)
      .eq('status', 'published')
      .maybeSingle()
      .abortSignal(signal),
      { label: 'getArticleBySlug', throwOnUnavailable: true }
    )
  } catch (error) {
    if (isMissingOgImageColumnError(error)) {
      try {
        article = await runSingleQuery(
          (signal) => supabase
            .from('articles')
            .select(ARTICLE_PAGE_SELECT_FALLBACK)
            .eq('slug', articleSlug)
            .eq('status', 'published')
            .maybeSingle()
            .abortSignal(signal),
          { label: 'getArticleBySlug:fallback', throwOnUnavailable: true }
        )
      } catch (fallbackError) {
        if (fallbackError.message === 'DATABASE_UNAVAILABLE') {
          console.error('Article fetch failed: database unavailable', {
            slug: articleSlug,
            category: categorySlug,
          })
          if (isBuildTime) {
            notFound()
          }
          isDatabaseUnavailable = true
        } else {
          console.error('Article fetch failed:', {
            slug: articleSlug,
            category: categorySlug,
            error: fallbackError,
          })
          notFound()
        }
      }
    } else if (error.message === 'DATABASE_UNAVAILABLE') {
      console.error('Article fetch failed: database unavailable', {
        slug: articleSlug,
        category: categorySlug,
      })
      if (isBuildTime) {
        notFound()
      }
      isDatabaseUnavailable = true
    } else {
      console.error('Article fetch failed:', {
        slug: articleSlug,
        category: categorySlug,
        error,
      })
      notFound()
    }
  }

  if (isDatabaseUnavailable) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PublicHeader categories={[]} />
        <div className="w-full max-w-6xl mx-auto px-4 py-6 pb-16 md:py-8 md:pb-10 lg:px-8">
          <div className="w-full max-w-xl rounded-[24px] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Article temporarily unavailable
            </h1>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              We could not load this story right now because the content service is unavailable. Please try again in a little while.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center justify-center border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:border-[#b4235a] hover:text-[#b4235a] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-[#d94b7d] dark:hover:text-[#d94b7d]"
            >
              Return to homepage
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!article) {
    console.error('Article fetch returned no data:', {
      slug: articleSlug,
      category: categorySlug,
    })
    notFound()
  }

  if (article.categories?.slug && article.categories.slug !== categorySlug) {
    permanentRedirect(`/${article.categories.slug}/${article.slug}`)
  }

  let authorProfile = article.authors || null
  let featuredImageMeta = null

  if (article.featured_image_url) {
    try {
      featuredImageMeta = await runSingleQuery(
        (signal) => supabase
          .from('media_library')
          .select('original_width, original_height')
          .eq('file_url', article.featured_image_url)
          .maybeSingle()
          .abortSignal(signal),
        { label: 'getArticleImageMeta' }
      )
    } catch (error) {
      console.error('Article image metadata fetch failed:', error?.message || error)
      featuredImageMeta = null
    }
  }

  if (
    (
      !authorProfile?.bio
      || !authorProfile?.name
      || !authorProfile?.slug
      || !authorProfile?.title
      || !authorProfile?.email
    )
    && article.author_id
  ) {
    try {
      authorProfile = await runSingleQuery(
        (signal) => supabase
          .from('authors')
          .select('id, slug, name, bio, avatar_url, title, email')
          .eq('id', article.author_id)
          .maybeSingle()
          .abortSignal(signal),
        { label: 'getAuthorProfile' }
      ) || authorProfile
    } catch (error) {
      console.error('Author profile fetch failed:', error?.message || error)
    }
  }

  const tagIds = (article.article_tags || [])
    .map((at) => at.tags?.id)
    .filter(Boolean)

  let relatedByCategory = []
  let latestArticles = []
  let engagementRows = []
  let categories = []
  let linkRows = []

  try {
    const [
      relatedByCategoryResult,
      latestArticlesResult,
      engagementRowsResult,
      categoriesResult,
      linkRowsResult,
    ] = await Promise.all([
      runListQuery(
        (signal) => supabase
          .from('articles')
          .select('id, title, slug, excerpt, featured_image_url, published_at, categories(slug), authors(name)')
          .eq('category_id', article.category_id)
          .eq('status', 'published')
          .neq('id', article.id)
          .order('published_at', { ascending: false })
          .limit(12)
          .abortSignal(signal),
        { label: 'getRelatedByCategory' }
      ),
      runListQuery(
        (signal) => supabase
          .from('articles')
          .select('id, title, slug, excerpt, featured_image_url, published_at, categories(slug), authors(name)')
          .eq('status', 'published')
          .neq('id', article.id)
          .order('published_at', { ascending: false })
          .limit(4)
          .abortSignal(signal),
        { label: 'getLatestArticles' }
      ),
      runListQuery(
        (signal) => supabase
          .from('article_engagement')
          .select('article_id, views, likes, shares')
          .order('views', { ascending: false })
          .order('shares', { ascending: false })
          .limit(60)
          .abortSignal(signal),
        { label: 'getArticleEngagement' }
      ),
      runListQuery(
        (signal) => supabase
          .from('categories')
          .select('id, name, slug')
          .order('name')
          .abortSignal(signal),
        { label: 'getArticlePageCategories' }
      ),
      tagIds.length > 0
        ? runListQuery(
          (signal) => supabase
            .from('article_tags')
            .select('article_id')
            .neq('article_id', article.id)
            .in('tag_id', tagIds)
            .limit(30)
            .abortSignal(signal),
          { label: 'getRelatedTagLinks' }
        )
        : Promise.resolve({ data: [] }),
    ])

    relatedByCategory = relatedByCategoryResult?.data || []
    latestArticles = latestArticlesResult?.data || []
    engagementRows = engagementRowsResult?.data || []
    categories = categoriesResult?.data || []
    linkRows = linkRowsResult?.data || []
  } catch (error) {
    console.error('Supplementary article data fetch failed:', error?.message || error)
  }

    let relatedByTag = []
    const tagMatchCount = new Map()
    if (tagIds.length > 0 && (linkRows || []).length > 0) {
      for (const row of linkRows || []) {
        if (!row?.article_id) continue
        tagMatchCount.set(row.article_id, (tagMatchCount.get(row.article_id) || 0) + 1)
      }

      const ids = [...new Set((linkRows || []).map((r) => r.article_id).filter(Boolean))]
      if (ids.length > 0) {
        try {
          const { data: taggedArticles } = await runListQuery(
            (signal) => supabase
              .from('articles')
              .select('id, title, slug, excerpt, featured_image_url, published_at, categories(slug), authors(name)')
              .in('id', ids)
              .eq('status', 'published')
              .order('published_at', { ascending: false })
              .limit(12)
              .abortSignal(signal),
            { label: 'getRelatedByTag' }
          )
          relatedByTag = taggedArticles || []
        } catch (error) {
          console.error('Tag-based related articles fetch failed:', error?.message || error)
        }
      }
    }

    const scoreMap = new Map(
      (engagementRows || []).map((row) => [
        row.article_id,
        (row.views || 0) + (row.likes || 0) * 3 + (row.shares || 0) * 5,
      ])
    )

    const relatedCandidates = new Map()
    for (const item of [...(relatedByCategory || []), ...relatedByTag, ...(latestArticles || [])]) {
      if (!item?.id || item.id === article.id) continue
      if (relatedCandidates.has(item.id)) continue

      const engagementScore = scoreMap.get(item.id) || 0
      const matchedTags = tagMatchCount.get(item.id) || 0
      const sameCategory = item.categories?.slug === article.categories?.slug
      const publishedAt = item.published_at ? new Date(item.published_at).getTime() : 0
      const ageInDays = publishedAt ? Math.max(0, (Date.now() - publishedAt) / (1000 * 60 * 60 * 24)) : 365
      const recencyBoost = Math.max(0, 18 - Math.min(ageInDays, 18))
      const relevanceScore = (sameCategory ? 45 : 0)
        + matchedTags * 70
        + Math.log10(engagementScore + 1) * 12
        + recencyBoost

      relatedCandidates.set(item.id, { ...item, _score: relevanceScore })
    }

    const sortedRelatedArticles = Array.from(relatedCandidates.values())
      .sort((a, b) => {
        if (b._score !== a._score) return b._score - a._score
        return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
      })

    // Keep the sidebar topically tight whenever the category has enough coverage.
    const sameCategoryRelatedArticles = sortedRelatedArticles.filter(
      (item) => item.categories?.slug === article.categories?.slug
    )

    const relatedArticles = (sameCategoryRelatedArticles.length > 0
      ? sameCategoryRelatedArticles
      : sortedRelatedArticles
    ).slice(0, 3)

    const articleUrl = getArticleCanonicalUrl(article)
    const authorLinkSlug = authorProfile?.slug
      || authorProfile?.id
      || article.author_id
      || slugFromText(authorProfile?.name || article.authors?.name || '')
      || article.authors?.id

    const articleWithImageMeta = {
      ...article,
      featured_image_width: featuredImageMeta?.original_width || null,
      featured_image_height: featuredImageMeta?.original_height || null,
    }

    const readingTimeMinutes = calculateReadingTime(article.content || '')
    const summaryPoints = generateSixtySecondSummary(article)
    const structuredOverride = parseStructuredDataOverride(article.structured_data)
    const schemas = generateArticleSchemas({
      article: articleWithImageMeta,
      articleUrl,
      readingTimeMinutes,
      structuredOverride,
      breadcrumbs: [
        { name: 'Home', url: siteUrl },
        { name: article.categories?.name || 'News', url: `${siteUrl}/category/${article.categories?.slug || 'news'}` },
        { name: article.title, url: articleUrl },
      ],
    })

    const filteredCategories = filterBlockedCategories(categories || [])
    const articleSchema = getNewsArticleSchema({
      title: article.title,
      description: article.excerpt || article.seo_description || '',
      url: articleUrl,
      imageUrl: article.featured_image_url || `${SITE_URL}/og-default.jpg`,
      publishedAt: article.published_at,
      updatedAt: article.updated_at || article.published_at,
      authorName: authorProfile?.name || article.authors?.name || 'EkahNews',
      authorUrl: `${SITE_URL}/authors/${authorLinkSlug}`,
      categoryName: article.categories?.name || categorySlug,
    })
    const breadcrumbSchema = getBreadcrumbSchema([
      { name: 'Home', url: SITE_URL },
      { name: article.categories?.name || categorySlug, url: `${SITE_URL}/category/${article.categories?.slug || categorySlug}` },
      { name: article.title, url: articleUrl },
    ])
    const schemaBlocks = [articleSchema, breadcrumbSchema]
    const maybeFaqs = Array.isArray(article?.faqs)
      ? article.faqs
      : Array.isArray(article?.content_json?.faqs)
        ? article.content_json.faqs
        : []
    if (maybeFaqs.length > 0) {
      schemaBlocks.push(getFAQSchema(maybeFaqs))
    } else {
      // FAQPage schema ready — add article.faqs field to content model to enable
    }
    schemaBlocks.push(getSpeakableSchema(articleUrl))

    return (
      <>
        <StructuredData data={schemas.primaryArticle} />
        <StructuredData data={schemas.breadcrumbList} />
        <SchemaScript schema={schemaBlocks} />

        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <PublicHeader categories={filteredCategories} />

          <article
            className="w-full max-w-6xl mx-auto px-4 py-6 pb-16 md:py-8 md:pb-10 lg:px-8"
            data-article-url={`/${params.categorySlug}/${params.articleSlug}`}
            data-article-title={article.title}
            data-article-slug={params.articleSlug}
            data-article-category={params.categorySlug}
          >
            <ReadingProgressBar />
            <div className="mb-6">
              <Breadcrumb
                items={[
                  { label: article.categories?.name || 'News', href: `/category/${article.categories?.slug || 'news'}` },
                  { label: article.title, href: `/${article.categories?.slug || 'news'}/${article.slug}` },
                ]}
              />
            </div>

            <header className="mb-8 border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_30%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] p-5 shadow-sm dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.14),_transparent_24%),linear-gradient(180deg,_#0f172a_0%,_#020617_100%)] md:p-8">
              <div className="mx-auto max-w-4xl">
                <div className="flex flex-wrap items-center gap-3">
                  {article.categories && (
                    <Link href={`/category/${article.categories.slug}`}>
                      <Badge className="border-0 bg-[#d62828] px-3 py-1 text-white hover:bg-[#b61f1f]">
                        {article.categories.name}
                      </Badge>
                    </Link>
                  )}
                  <Badge variant="secondary" className="px-3 py-1">
                    {readingTimeMinutes} min read
                  </Badge>
                </div>

                <h1 className="mt-4 max-w-4xl text-[34px] font-extrabold leading-[1.03] tracking-tight text-slate-900 dark:text-white md:text-[30px]">
                  {article.title}
                </h1>

                {article.excerpt && (
                  <p className="mt-5 max-w-4xl text-lg leading-8 text-slate-700 dark:text-slate-300">
                    {article.excerpt}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3 px-1 py-2 text-sm text-slate-600 dark:text-slate-400 md:gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:min-w-[220px]">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={authorProfile?.avatar_url || ''} />
                      <AvatarFallback>
                        {(authorProfile?.name || article.authors?.name || '').split(' ').map((n) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <Link href={`/authors/${authorLinkSlug}`} className="font-semibold text-slate-900 hover:text-[#d62828] hover:underline dark:text-white dark:hover:text-red-400">
                        {authorProfile?.name || article.authors?.name}
                      </Link>
                      <div className="mt-0.5 flex flex-col gap-0.5 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                        <div>
                          <time dateTime={article.published_at}>
                            Published {format(new Date(article.published_at), 'MMMM d, yyyy • h:mm a')}
                          </time>
                        </div>
                        {article.updated_at !== article.published_at && (
                          <div>
                            <time dateTime={article.updated_at}>
                              Updated {format(new Date(article.updated_at), 'MMMM d, yyyy • h:mm a')}
                            </time>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <ArticleFollowStrip articleUrl={articleUrl} articleTitle={article.title} />
                </div>
              </div>
            </header>

            {article.featured_image_url && (
              <figure className="mb-10 overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <Image
                    src={article.featured_image_url}
                    alt={article.featured_image_alt || article.title}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1280px) 100vw, 1200px"
                  />
                </div>
              </figure>
            )}

            <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-8">
                <div>
                  <div className="w-full">
                    <ArticleSummaryToggles
                      summaryPoints={summaryPoints}
                    />

                    <SafeHtml
                      html={article.content || ''}
                      baseUrl={siteUrl}
                      className="article-content prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-headings:leading-snug prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-2 prose-h3:text-lg prose-h3:mt-5 prose-h3:mb-2 prose-p:text-base prose-p:leading-7 prose-p:text-slate-800 prose-p:my-3 prose-a:text-blue-600 prose-a:no-underline prose-a:hover:underline prose-strong:text-slate-900 prose-img:rounded-none prose-img:my-4 prose-blockquote:border-l-2 prose-blockquote:border-slate-300 prose-blockquote:text-slate-600 prose-blockquote:pl-4 prose-blockquote:my-4 dark:prose-invert"
                    />

                    {(article.article_tags || []).length > 0 && (
                      <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
                        <div className="flex flex-wrap gap-2">
                          {article.article_tags
                            .map((entry) => entry?.tags)
                            .filter(Boolean)
                            .map((tag) => (
                              <Link key={tag.id || tag.slug} href={`/tags/${tag.slug}`}>
                                <Badge variant="secondary" className="px-3 py-1 text-sm hover:bg-slate-200 dark:hover:bg-slate-800">
                                  {tag.name}
                                </Badge>
                              </Link>
                            ))}
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                <ContinuousReader
                  initialSlug={params.articleSlug}
                  initialCategorySlug={params.categorySlug}
                  initialTitle={article.title}
                />
              </div>

              <aside className="space-y-6 xl:sticky xl:top-28">
                {(relatedArticles?.length || 0) > 0 && (
                  <DynamicRelatedSidebar
                    initialArticleSlug={params.articleSlug}
                    initialCategorySlug={params.categorySlug}
                    initialRelatedStories={relatedArticles.slice(0, 3)}
                  />
                )}

                {/* Hide the entire sidebar slot until a live ad config exists. */}
                {shouldRenderSidebarAd && (
                  <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/70 p-4 text-center dark:border-slate-700 dark:bg-slate-900/60">
                    <SidebarAd />
                  </div>
                )}
              </aside>
            </div>
          </article>
        </div>
      </>
    )
  
}
