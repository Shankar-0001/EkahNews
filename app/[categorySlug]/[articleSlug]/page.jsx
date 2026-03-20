import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, Clock } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import Image from 'next/image'
import PublicHeader from '@/components/layout/PublicHeader'
import StructuredData from '@/components/seo/StructuredData'
import { InArticleAd, MobileStickyAd } from '@/components/ads/AdComponent'
import { generateArticleSchemas } from '@/lib/seo-utils'
import { calculateReadingTime, generateSixtySecondSummary, generateAeoSnapshot } from '@/lib/content-utils'
import ReadingProgressBar from '@/components/article/ReadingProgressBar'
import StickyShareBar from '@/components/article/StickyShareBar'
import ArticleSummaryToggles from '@/components/article/ArticleSummaryToggles'
import ArticleMiniCard from '@/components/content/ArticleMiniCard'
import { applyLinkPolicyToHtml } from '@/lib/link-policy'
import { buildLanguageAlternates, slugFromText } from '@/lib/site-config'
import { buildArticleKeywords, keywordsToMetadataValue, keywordsToTopicLinks } from '@/lib/keywords'
import { injectInternalLinks } from '@/lib/internal-linking'

// ISR Configuration - Revalidate every 30 minutes
export const revalidate = 1800

// Generate static params for published articles
export async function generateStaticParams() {
  // Use direct Supabase client without cookies for static generation
  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { data: articles } = await supabase
    .from('articles')
    .select('slug, categories(slug)')
    .eq('status', 'published')
    .limit(10)

  return articles?.map((article) => ({
    categorySlug: article.categories?.slug || 'news',
    articleSlug: article.slug,
  })) || []
}

// Generate metadata for SEO
export async function generateMetadata({ params }) {
  try {
    const supabase = await createClient()
    const { articleSlug } = params

    const { data: article } = await supabase
      .from('articles')
      .select(`
        id,
        title,
        slug,
        excerpt,
        seo_title,
        seo_description,
        featured_image_url,
        featured_image_alt,
        published_at,
        updated_at,
        status,
        category_id,
        author_id,
        authors (id, name, slug),
        categories (name, slug),
        article_tags (tags (name, slug))
      `)
      .eq('slug', articleSlug)
      .eq('status', 'published')
      .single()

    if (!article) {
      return {
        title: 'Article Not Found',
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ekahnews.com'
    const articleUrl = `${siteUrl}/${article.categories?.slug || 'news'}/${article.slug}`
    const keywords = buildArticleKeywords(article)
    const authorLinkSlug = article.authors?.id
      || article.author_id
      || article.authors?.slug
      || slugFromText(article.authors?.name || '')

    return {
      title: article.seo_title || article.title,
      description: article.seo_description || article.excerpt,
      keywords: keywordsToMetadataValue(keywords),
      authors: article.authors ? [{ name: article.authors.name, url: `${siteUrl}/authors/${authorLinkSlug}` }] : [],
      openGraph: {
        title: article.seo_title || article.title,
        description: article.seo_description || article.excerpt,
        type: 'article',
        publishedTime: article.published_at,
        modifiedTime: article.updated_at,
        authors: article.authors?.name ? [article.authors.name] : [],
        images: article.featured_image_url ? [{
          url: article.featured_image_url,
          width: 1200,
          height: 630,
          alt: article.title,
        }] : [],
        url: articleUrl,
      },
      twitter: {
        card: 'summary_large_image',
        title: article.seo_title || article.title,
        description: article.seo_description || article.excerpt,
        images: article.featured_image_url ? [article.featured_image_url] : [],
      },
      alternates: {
        canonical: articleUrl,
        languages: buildLanguageAlternates(`/${article.categories?.slug || 'news'}/${article.slug}`),
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
  try {
    const supabase = await createClient()
    const { categorySlug, articleSlug } = params
    const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ekahnews.com'

  // Fetch article
  const { data: article } = await supabase
    .from('articles')
    .select(`
      id,
      title,
      slug,
      excerpt,
      content,
      content_json,
      featured_image_url,
      featured_image_alt,
      published_at,
      updated_at,
      status,
      category_id,
      author_id,
      authors (id, slug, name, bio, avatar_url),
      categories (name, slug),
      article_tags (tags (id, name, slug))
    `)
    .eq('slug', articleSlug)
    .eq('status', 'published')
    .single()

  if (!article) {
    notFound()
  }

  if (article.categories?.slug && article.categories.slug !== categorySlug) {
    notFound()
  }

  let authorProfile = article.authors || null
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
    const { data: profileRow } = await supabase
      .from('authors')
      .select('id, slug, name, bio, avatar_url, title, email')
      .eq('id', article.author_id)
      .maybeSingle()
    authorProfile = profileRow || authorProfile
  }
  const authorBio = authorProfile?.bio || ''

  // Related: same tags
  const tagIds = (article.article_tags || [])
    .map((at) => at.tags?.id)
    .filter(Boolean)

  const [
    { data: relatedByCategory },
    { data: latestArticles },
    { data: engagementRows },
    { data: trendingCandidates },
    { data: categories },
    { data: linkRows },
  ] = await Promise.all([
    supabase
      .from('articles')
      .select('id, title, slug, excerpt, featured_image_url, published_at, categories(slug), authors(name)')
      .eq('category_id', article.category_id)
      .eq('status', 'published')
      .neq('id', article.id)
      .order('published_at', { ascending: false })
      .limit(4),
    supabase
      .from('articles')
      .select('id, title, slug, excerpt, featured_image_url, published_at, categories(slug), authors(name)')
      .eq('status', 'published')
      .neq('id', article.id)
      .order('published_at', { ascending: false })
      .limit(10),
    supabase
      .from('article_engagement')
      .select('article_id, views, likes, shares')
      .limit(10),
    supabase
      .from('articles')
      .select('id, title, slug, excerpt, featured_image_url, published_at, categories(slug), authors(name)')
      .eq('status', 'published')
      .neq('id', article.id)
      .order('published_at', { ascending: false })
      .limit(10),
    supabase
      .from('categories')
      .select('id, name, slug')
      .order('name'),
    tagIds.length > 0
      ? supabase
        .from('article_tags')
        .select('article_id')
        .neq('article_id', article.id)
        .in('tag_id', tagIds)
        .limit(10)
      : Promise.resolve({ data: [] }),
  ])

  let relatedByTag = []
  if (tagIds.length > 0 && (linkRows || []).length > 0) {
    const ids = [...new Set((linkRows || []).map((r) => r.article_id).filter(Boolean))]
    if (ids.length > 0) {
      const { data: taggedArticles } = await supabase
        .from('articles')
        .select('id, title, slug, excerpt, featured_image_url, published_at, categories(slug), authors(name)')
        .in('id', ids)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(4)
      relatedByTag = taggedArticles || []
    }
  }

  const relatedMap = new Map()
  ;[...(relatedByCategory || []), ...relatedByTag, ...(latestArticles || [])].forEach((item) => {
    if (!item?.id || item.id === article.id || relatedMap.has(item.id)) return
    relatedMap.set(item.id, item)
  })
  const relatedArticles = Array.from(relatedMap.values()).slice(0, 4)

  const scoreMap = new Map(
    (engagementRows || []).map((row) => [
      row.article_id,
      (row.views || 0) + (row.likes || 0) * 3 + (row.shares || 0) * 5,
    ])
  )

  const trendingArticles = (trendingCandidates || [])
    .map((item) => ({ ...item, _score: scoreMap.get(item.id) || 0 }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 5)

  const articleUrl = `${siteUrl}/${article.categories?.slug || 'news'}/${article.slug}`
  const authorLinkSlug = authorProfile?.id
    || article.author_id
    || authorProfile?.slug
    || slugFromText(authorProfile?.name || article.authors?.name || '')
    || article.authors?.id
  const breadcrumbItems = [
    { label: article.categories?.name || 'News', href: `/category/${article.categories?.slug || 'news'}` },
    { label: article.title, href: `/${article.categories?.slug || 'news'}/${article.slug}` },
  ]

  const readingTimeMinutes = calculateReadingTime(article.content || '')
  const summaryPoints = generateSixtySecondSummary(article)
  const aeoSnapshot = generateAeoSnapshot(article)
  const articleKeywords = buildArticleKeywords(article)
  const keywordTopicLinks = keywordsToTopicLinks(articleKeywords)
  const safeArticleContent = applyLinkPolicyToHtml(article.content || '', {
    baseUrl: siteUrl,
    nofollowExternal: true,
  })
  const internalLinkCandidates = [
    { keyword: article.categories?.name || '', href: `/category/${article.categories?.slug || 'news'}` },
    ...(article.article_tags || []).map((tag) => ({
      keyword: tag.tags?.name || '',
      href: `/tags/${tag.tags?.slug}`,
    })),
    ...keywordTopicLinks.map((item) => ({ keyword: item.keyword, href: `/topic/${item.slug}` })),
    ...relatedArticles.map((item) => ({
      keyword: item.title || '',
      href: `/${item.categories?.slug || 'news'}/${item.slug}`,
    })),
  ].filter((item) => item.keyword && item.href && item.href !== `/${article.categories?.slug || 'news'}/${article.slug}`)
  const enhancedArticleContent = injectInternalLinks(safeArticleContent, internalLinkCandidates, 5)
  const faqItems = [
    {
      question: `What is this article about?`,
      answer: article.excerpt || `This article covers ${article.title}.`,
    },
    {
      question: 'How long does this article take to read?',
      answer: `About ${readingTimeMinutes} minute${readingTimeMinutes > 1 ? 's' : ''}.`,
    },
  ]
  const schemas = generateArticleSchemas({
    article,
    articleUrl,
    readingTimeMinutes,
    faqItems,
    breadcrumbs: [
      { name: 'Home', url: siteUrl },
      { name: article.categories?.name || 'News', url: `${siteUrl}/category/${article.categories?.slug || 'news'}` },
      { name: article.title, url: articleUrl },
    ],
  })

    return (
    <>
      <StructuredData data={schemas.newsArticle} />
      <StructuredData data={schemas.blogPosting} />
      <StructuredData data={schemas.breadcrumbList} />
      <StructuredData data={schemas.faqPage} />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PublicHeader categories={categories || []} />

        {/* Article Content */}
        <article className="w-full max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 pb-16 md:pb-8">
          <ReadingProgressBar />
          <StickyShareBar articleUrl={articleUrl} articleTitle={article.title} />
          {/* Breadcrumb UI intentionally omitted; schema is emitted via JSON-LD */}

          <Card className="p-4 md:p-6 lg:p-8 dark:bg-gray-800 dark:border-gray-700 shadow-sm">
            <div className="mx-auto max-w-[720px]">
              {/* Category Badge */}
              {article.categories && (
                <Link href={`/category/${article.categories.slug}`}>
                  <Badge variant="secondary" className="mb-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600">
                    {article.categories.name}
                  </Badge>
                </Link>
              )}

              {/* Title - H1 for SEO */}
              <h1 className="text-[30px] leading-tight font-extrabold text-gray-900 dark:text-white mb-5 md:text-[44px] tracking-tight">
                {article.title}
              </h1>

              {/* Excerpt */}
              {article.excerpt && (
                <p className="text-[19px] text-gray-700 dark:text-gray-300 mb-6 leading-[1.8]">
                  {article.excerpt}
                </p>
              )}

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 mb-8 pb-6 border-b dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={authorProfile?.avatar_url || ''} />
                    <AvatarFallback>
                      {(authorProfile?.name || article.authors?.name || '').split(' ').map((n) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">By</span>
                    <Link href={`/authors/${authorLinkSlug}`}>
                      <strong className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer">{authorProfile?.name || article.authors?.name}</strong>
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <time dateTime={article.published_at}>
                    Published {format(new Date(article.published_at), 'MMMM d, yyyy')} ({formatDistanceToNow(new Date(article.published_at), { addSuffix: true })})
                  </time>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{readingTimeMinutes} min read</span>
                </div>
                {article.updated_at !== article.published_at && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <time dateTime={article.updated_at}>
                      Updated {format(new Date(article.updated_at), 'MMMM d, yyyy')} ({formatDistanceToNow(new Date(article.updated_at), { addSuffix: true })})
                    </time>
                  </div>
                )}
              </div>

              <ArticleSummaryToggles
                summaryPoints={summaryPoints}
                aeoSnapshot={aeoSnapshot}
                articleId={article.id}
                articleUrl={articleUrl}
                articleTitle={article.title}
              />
            </div>

            {/* Featured Image - Optimized for Google Discover */}
            {article.featured_image_url && (
              <div className="mb-8 mx-auto max-w-[720px] rounded-xl overflow-hidden relative w-full aspect-video md:aspect-[21/9]">
                <Image
                  src={article.featured_image_url}
                  alt={article.featured_image_alt || article.title}
                  fill
                  className="object-cover"
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, 720px"
                />
              </div>
            )}

            <div className="mx-auto max-w-[720px] space-y-6">
              {/* Article Content */}
              <div
                className="article-content prose prose-lg dark:prose-invert mb-8"
                dangerouslySetInnerHTML={{ __html: enhancedArticleContent }}
              />
            </div>

            {/* In-Article Ad */}
            <InArticleAd />

            {/* Tags */}
            {article.article_tags && article.article_tags.length > 0 && (
              <div className="mt-12 pt-8 border-t dark:border-gray-700 mx-auto max-w-[720px]">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase">Tagged</h3>
                <div className="flex flex-wrap gap-2">
                  {article.article_tags.map((at) => (
                    <Link key={at.tags.slug} href={`/tags/${at.tags.slug}`}>
                      <Badge variant="outline" className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                        {at.tags.name}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {keywordTopicLinks.length > 0 && (
              <div className="mt-8 mx-auto max-w-[720px]">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase">Related Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {keywordTopicLinks.map((item) => (
                    <Link key={item.slug} href={`/topic/${item.slug}`}>
                      <Badge variant="outline" className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                        {item.keyword}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </Card>

          {/* You May Also Like */}
          {relatedArticles && relatedArticles.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6 dark:text-white">You May Also Like</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedArticles.map((related) => (
                  <Link
                    key={related.id}
                    href={`/${related.categories?.slug || 'news'}/${related.slug}`}
                  >
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full dark:bg-gray-800 dark:border-gray-700">
                      {related.featured_image_url && (
                        <div className="relative w-full aspect-video">
                          <Image
                            src={related.featured_image_url}
                            alt={related.title}
                            fill
                            className="object-cover rounded-t-lg"
                            sizes="(max-width: 768px) 100vw, 33vw"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-bold mb-2 line-clamp-2 dark:text-white">{related.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {related.excerpt}
                        </p>
                        <div className="flex items-center gap-2 mt-3 text-xs text-gray-500 dark:text-gray-500">
                          <span>{related.authors?.name}</span>
                          <span>-</span>
                          <time>{format(new Date(related.published_at), 'MMM d, yyyy')}</time>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Trending Now */}
          {trendingArticles && trendingArticles.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6 dark:text-white">Trending Now</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {trendingArticles.map((trending) => (
                  <ArticleMiniCard key={trending.id} article={trending} compact />
                ))}
              </div>
            </div>
          )}

          {/* Latest News */}
          {latestArticles && latestArticles.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6 dark:text-white">Latest News</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {latestArticles.slice(0, 6).map((item) => (
                  <ArticleMiniCard key={item.id} article={item} compact />
                ))}
              </div>
            </div>
          )}

        </article>
      </div>
    </>
  )
  } catch {
    notFound()
  }
}

