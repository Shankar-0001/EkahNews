import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, Clock, TrendingUp } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import Image from 'next/image'
import PublicHeader from '@/components/layout/PublicHeader'
import StructuredData from '@/components/seo/StructuredData'
import { InArticleAd } from '@/components/ads/AdComponent'
import { generateArticleSchemas } from '@/lib/seo-utils'
import { calculateReadingTime, generateSixtySecondSummary, generateAeoSnapshot } from '@/lib/content-utils'
import ReadingProgressBar from '@/components/article/ReadingProgressBar'
import StickyShareBar from '@/components/article/StickyShareBar'
import ArticleSummaryToggles from '@/components/article/ArticleSummaryToggles'
import ArticleMiniCard from '@/components/content/ArticleMiniCard'
import SafeHtml from '@/components/SafeHtml'
import { buildLanguageAlternates, getArticleCanonicalUrl, slugFromText } from '@/lib/site-config'
import { buildArticleKeywords, keywordsToMetadataValue, keywordsToTopicLinks } from '@/lib/keywords'
import { parseStructuredDataOverride } from '@/lib/seo-utils'

export const revalidate = 1800

export async function generateStaticParams() {
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
    const articleUrl = getArticleCanonicalUrl(article)
    const keywords = buildArticleKeywords(article)
    const authorLinkSlug = article.authors?.slug
      || article.authors?.id
      || article.author_id
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

    const tagIds = (article.article_tags || [])
      .map((at) => at.tags?.id)
      .filter(Boolean)

    const [
      { data: relatedByCategory },
      { data: latestArticles },
      { data: engagementRows },
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
        .limit(12),
      supabase
        .from('articles')
        .select('id, title, slug, excerpt, featured_image_url, published_at, categories(slug), authors(name)')
        .eq('status', 'published')
        .neq('id', article.id)
        .order('published_at', { ascending: false })
        .limit(12),
      supabase
        .from('article_engagement')
        .select('article_id, views, likes, shares')
        .order('views', { ascending: false })
        .order('shares', { ascending: false })
        .limit(60),
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
          .limit(30)
        : Promise.resolve({ data: [] }),
    ])

    let relatedByTag = []
    const tagMatchCount = new Map()
    if (tagIds.length > 0 && (linkRows || []).length > 0) {
      for (const row of linkRows || []) {
        if (!row?.article_id) continue
        tagMatchCount.set(row.article_id, (tagMatchCount.get(row.article_id) || 0) + 1)
      }

      const ids = [...new Set((linkRows || []).map((r) => r.article_id).filter(Boolean))]
      if (ids.length > 0) {
        const { data: taggedArticles } = await supabase
          .from('articles')
          .select('id, title, slug, excerpt, featured_image_url, published_at, categories(slug), authors(name)')
          .in('id', ids)
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(12)
        relatedByTag = taggedArticles || []
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

    const relatedArticles = Array.from(relatedCandidates.values())
      .sort((a, b) => {
        if (b._score !== a._score) return b._score - a._score
        return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
      })
      .slice(0, 4)

    const trendingIds = [...new Set((engagementRows || []).map((row) => row.article_id).filter(Boolean))]
    let trendingArticles = []
    if (trendingIds.length > 0) {
      const { data: trendingPool } = await supabase
        .from('articles')
        .select('id, title, slug, excerpt, featured_image_url, published_at, categories(slug), authors(name)')
        .in('id', trendingIds)
        .eq('status', 'published')
        .neq('id', article.id)
        .limit(20)

      const sortedTrending = (trendingPool || [])
        .map((item) => ({ ...item, _score: scoreMap.get(item.id) || 0 }))
        .sort((a, b) => {
          if (b._score !== a._score) return b._score - a._score
          return new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime()
        })

      trendingArticles = sortedTrending.slice(0, 5)
    }

    if (trendingArticles.length < 5) {
      const existingIds = new Set(trendingArticles.map((item) => item.id))
      for (const item of latestArticles || []) {
        if (!item?.id || item.id === article.id || existingIds.has(item.id)) continue
        trendingArticles.push(item)
        existingIds.add(item.id)
        if (trendingArticles.length >= 5) break
      }
    }

    const articleUrl = getArticleCanonicalUrl(article)
    const authorLinkSlug = authorProfile?.slug
      || authorProfile?.id
      || article.author_id
      || slugFromText(authorProfile?.name || article.authors?.name || '')
      || article.authors?.id

    const readingTimeMinutes = calculateReadingTime(article.content || '')
    const summaryPoints = generateSixtySecondSummary(article)
    const aeoSnapshot = generateAeoSnapshot(article)
    const articleKeywords = buildArticleKeywords(article)
    const keywordTopicLinks = keywordsToTopicLinks(articleKeywords)
    const structuredOverride = parseStructuredDataOverride(article.structured_data)
    const schemas = generateArticleSchemas({
      article,
      articleUrl,
      readingTimeMinutes,
      structuredOverride,
      breadcrumbs: [
        { name: 'Home', url: siteUrl },
        { name: article.categories?.name || 'News', url: `${siteUrl}/category/${article.categories?.slug || 'news'}` },
        { name: article.title, url: articleUrl },
      ],
    })

    return (
      <>
        <StructuredData data={schemas.primaryArticle} />
        <StructuredData data={schemas.breadcrumbList} />

        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <PublicHeader categories={categories || []} />

          <article className="w-full max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 pb-16 md:pb-10">
            <ReadingProgressBar />
            <StickyShareBar articleUrl={articleUrl} articleTitle={article.title} />

            <div className="mb-8 rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_34%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] p-5 md:p-8 shadow-sm dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.14),_transparent_24%),linear-gradient(180deg,_#0f172a_0%,_#020617_100%)]">
              <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_360px] xl:items-start">
                <div className="max-w-[860px]">
                  <div className="flex flex-wrap items-center gap-3 mb-5">
                    {article.categories && (
                      <Link href={`/category/${article.categories.slug}`}>
                        <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-0 px-3 py-1">{article.categories.name}</Badge>
                      </Link>
                    )}
                    <Badge variant="secondary" className="px-3 py-1">{readingTimeMinutes} min read</Badge>
                  </div>

                  <h1 className="text-[32px] leading-[1.05] font-extrabold text-gray-900 dark:text-white mb-5 md:text-[56px] tracking-tight max-w-4xl">
                    {article.title}
                  </h1>

                  {article.excerpt && (
                    <p className="text-[19px] text-gray-700 dark:text-gray-300 mb-6 leading-[1.8] max-w-3xl">
                      {article.excerpt}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 md:gap-6 rounded-[24px] border border-slate-200 bg-white/85 px-4 py-4 text-sm text-gray-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-gray-400">
                    <div className="flex items-center gap-3 min-w-[220px]">
                      <Avatar className="h-10 w-10">
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
                        Published {format(new Date(article.published_at), 'MMMM d, yyyy')}
                      </time>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}</span>
                    </div>
                    {article.updated_at !== article.published_at && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <time dateTime={article.updated_at}>
                          Updated {format(new Date(article.updated_at), 'MMMM d, yyyy')}
                        </time>
                      </div>
                    )}
                  </div>

                </div>

                <div className="space-y-4">
                  {article.featured_image_url && (
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[26px] border border-slate-200 shadow-sm dark:border-slate-800">
                      <Image
                        src={article.featured_image_url}
                        alt={article.featured_image_alt || article.title}
                        fill
                        className="object-cover"
                        priority
                        sizes="(max-width: 1280px) 100vw, 360px"
                      />
                    </div>
                  )}

                </div>
              </div>
            </div>

            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px] items-start">
              <div>
                <Card className="rounded-[28px] p-3 sm:p-4 md:p-6 lg:p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <div className="mx-auto max-w-[720px]">
                    <ArticleSummaryToggles
                      summaryPoints={summaryPoints}
                      aeoSnapshot={aeoSnapshot}
                      articleId={article.id}
                      articleUrl={articleUrl}
                      articleTitle={article.title}
                    />

                    {article.featured_image_url && (
                      <div className="mb-8 mt-8 rounded-[24px] overflow-hidden relative w-full aspect-video md:aspect-[21/9]">
                        <Image
                          src={article.featured_image_url}
                          alt={article.featured_image_alt || article.title}
                          fill
                          className="object-cover"
                          priority
                          sizes="(max-width: 768px) 100vw, 760px"
                        />
                      </div>
                    )}

                    <div className="space-y-6">
                      <SafeHtml
                        html={article.content || ''}
                        baseUrl={siteUrl}
                        className="article-content prose prose-slate dark:prose-invert mb-8 max-w-none"
                      />
                    </div>

                    <InArticleAd />

                    {article.article_tags && article.article_tags.length > 0 && (
                      <div className="mt-12 pt-8 border-t dark:border-gray-700">
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
                      <div className="mt-8">
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
                  </div>
                </Card>
              </div>

              <aside className="space-y-6 xl:sticky xl:top-28">
                <Card className="rounded-[24px] dark:bg-gray-800 dark:border-gray-700 shadow-sm">
                  <div className="p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Explore Sections</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(categories || []).slice(0, 10).map((item) => (
                        <Link
                          key={item.id}
                          href={`/category/${item.slug}`}
                          className={`rounded-full border px-3 py-2 text-sm transition-colors ${item.slug === article.categories?.slug ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </Card>

                {relatedArticles && relatedArticles.length > 0 && (
                  <Card className="rounded-[24px] dark:bg-gray-800 dark:border-gray-700 shadow-sm">
                    <div className="p-6">
                      <h2 className="text-xl font-bold mb-4 dark:text-white">You May Also Like</h2>
                      <div className="grid grid-cols-1 gap-4">
                        {relatedArticles.map((related) => (
                          <ArticleMiniCard key={related.id} article={related} compact />
                        ))}
                      </div>
                    </div>
                  </Card>
                )}

                {trendingArticles && trendingArticles.length > 0 && (
                  <Card className="rounded-[24px] dark:bg-gray-800 dark:border-gray-700 shadow-sm">
                    <div className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="h-4 w-4 text-orange-500" />
                        <h2 className="text-xl font-bold dark:text-white">Trending Now</h2>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {trendingArticles.map((trending) => (
                          <ArticleMiniCard key={trending.id} article={trending} compact />
                        ))}
                      </div>
                    </div>
                  </Card>
                )}
              </aside>
            </div>

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
