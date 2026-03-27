import { createPublicClient } from '@/lib/supabase/public-server'
import { notFound, permanentRedirect } from 'next/navigation'
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
import AdPlaceholder from '@/components/common/AdPlaceholder'
import { buildArticleImageVariants, generateArticleSchemas } from '@/lib/seo-utils'
import { calculateReadingTime, generateSixtySecondSummary, generateAeoSnapshot } from '@/lib/content-utils'
import ReadingProgressBar from '@/components/article/ReadingProgressBar'
import StickyShareBar from '@/components/article/StickyShareBar'
import ArticleSummaryToggles from '@/components/article/ArticleSummaryToggles'
import ArticleMiniCard from '@/components/content/ArticleMiniCard'
import Breadcrumb from '@/components/common/Breadcrumb'
import SafeHtml from '@/components/SafeHtml'
import { buildLanguageAlternates, getArticleCanonicalUrl, SITE_URL, slugFromText } from '@/lib/site-config'
import { buildArticleKeywords, keywordsToMetadataValue } from '@/lib/keywords'
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
    const supabase = createPublicClient()
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

    let metadataImageMeta = null
    if (article.featured_image_url) {
      const { data: mediaRow } = await supabase
        .from('media_library')
        .select('original_width, original_height')
        .eq('file_url', article.featured_image_url)
        .maybeSingle()
      metadataImageMeta = mediaRow || null
    }

    const articleForMetadata = {
      ...article,
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
        description: article.seo_description || article.excerpt,
        images: buildArticleImageVariants(articleForMetadata).map((image) => image.url),
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
    const supabase = createPublicClient()
    const { categorySlug, articleSlug } = params
    const siteUrl = SITE_URL

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
      permanentRedirect(`/${article.categories.slug}/${article.slug}`)
    }

    let authorProfile = article.authors || null
    let featuredImageMeta = null

    if (article.featured_image_url) {
      const { data: mediaRow } = await supabase
        .from('media_library')
        .select('original_width, original_height')
        .eq('file_url', article.featured_image_url)
        .maybeSingle()
      featuredImageMeta = mediaRow || null
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

    const articleWithImageMeta = {
      ...article,
      featured_image_width: featuredImageMeta?.original_width || null,
      featured_image_height: featuredImageMeta?.original_height || null,
    }

    const readingTimeMinutes = calculateReadingTime(article.content || '')
    const summaryPoints = generateSixtySecondSummary(article)
    const aeoSnapshot = generateAeoSnapshot(article)
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

    return (
      <>
        <StructuredData data={schemas.primaryArticle} />
        <StructuredData data={schemas.breadcrumbList} />

        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <PublicHeader categories={categories || []} />

          <article className="w-full max-w-6xl mx-auto px-4 py-6 pb-16 md:py-8 md:pb-10 lg:px-8">
            <ReadingProgressBar />
            <StickyShareBar articleUrl={articleUrl} articleTitle={article.title} />
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

                <h1 className="mt-5 max-w-4xl text-[34px] font-extrabold leading-[1.03] tracking-tight text-slate-900 dark:text-white md:text-[58px]">
                  {article.title}
                </h1>

                {article.excerpt && (
                  <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700 dark:text-slate-300">
                    {article.excerpt}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-4 border border-slate-200 bg-white/85 px-4 py-4 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400 md:gap-6">
                  <div className="flex min-w-0 flex-1 items-center gap-3 sm:min-w-[220px]">
                    <Avatar className="h-11 w-11">
                      <AvatarImage src={authorProfile?.avatar_url || ''} />
                      <AvatarFallback>
                        {(authorProfile?.name || article.authors?.name || '').split(' ').map((n) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Byline</span>
                      <Link href={`/authors/${authorLinkSlug}`} className="font-semibold text-slate-900 hover:text-[#d62828] hover:underline dark:text-white dark:hover:text-red-400">
                        {authorProfile?.name || article.authors?.name}
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
                <Card className="border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-6 lg:p-8">
                  <div className="mx-auto max-w-[740px]">
                    <ArticleSummaryToggles
                      summaryPoints={summaryPoints}
                      aeoSnapshot={aeoSnapshot}
                      articleId={article.id}
                      articleUrl={articleUrl}
                      articleTitle={article.title}
                    />

                    <SafeHtml
                      html={article.content || ''}
                      baseUrl={siteUrl}
                      className="article-content prose prose-lg prose-slate max-w-none prose-headings:scroll-mt-28 prose-headings:font-bold prose-h2:mt-10 prose-h2:text-2xl prose-h3:mt-8 prose-h3:text-xl prose-p:leading-8 prose-li:leading-7 prose-strong:text-slate-900 dark:prose-invert dark:prose-strong:text-white"
                    />

                    {article.article_tags && article.article_tags.length > 0 && (
                      <div className="mt-10 border-t border-slate-200 pt-8 dark:border-slate-800">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          Story Tags
                        </h2>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {article.article_tags.map((at) => (
                            <Link key={at.tags.slug} href={`/tags/${at.tags.slug}`}>
                              <Badge variant="outline" className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                                {at.tags.name}
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {relatedArticles && relatedArticles.length > 0 && (
                  <section>
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                          Keep Reading
                        </p>
                        <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                          Related Articles
                        </h2>
                      </div>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      {relatedArticles.map((related) => (
                        <ArticleMiniCard key={related.id} article={related} compact />
                      ))}
                    </div>
                  </section>
                )}

              </div>

              <aside className="space-y-6 xl:sticky xl:top-28">
                {latestArticles && latestArticles.length > 0 && (
                  <aside className="h-full border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#d62828] dark:text-red-400" />
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-300">
                        Latest News
                      </p>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {latestArticles.slice(0, 4).map((item) => (
                        <Link
                          key={item.id}
                          href={`/${item.categories?.slug || 'news'}/${item.slug}`}
                          className="group grid min-w-0 grid-cols-[minmax(0,1fr)_72px] items-center gap-2 p-2 sm:grid-cols-[minmax(0,1fr)_80px] sm:p-2.5 lg:grid-cols-[minmax(0,1fr)_88px]"
                        >
                          <div className="min-w-0">
                            <p className="break-words text-[0.92rem] font-medium leading-snug text-slate-900 decoration-current underline-offset-4 group-hover:underline dark:text-white sm:text-[0.98rem]">
                              {item.title}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                              {item.published_at && (
                                <span>{formatDistanceToNow(new Date(item.published_at), { addSuffix: true })}</span>
                              )}
                              {item.authors?.name && (
                                <span>by {item.authors.name}</span>
                              )}
                            </div>
                          </div>

                          <div className="relative h-[72px] w-[72px] overflow-hidden bg-slate-100 dark:bg-slate-800 sm:h-[80px] sm:w-[80px] lg:h-[88px] lg:w-[88px]">
                            {item.featured_image_url ? (
                              <Image
                                src={item.featured_image_url}
                                alt={item.title}
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
                  </aside>
                )}

                {trendingArticles && trendingArticles.length > 0 && (
                  <aside className="h-full border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-[#d62828]" />
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                        Popular Now
                      </p>
                    </div>
                    <div className="mt-3 space-y-2">
                      {trendingArticles.map((item, index) => (
                        <Link
                          key={item.id}
                          href={`/${item.categories?.slug || 'news'}/${item.slug}`}
                          className="group flex gap-2 p-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <span className="mt-1 text-lg font-black text-slate-300 dark:text-slate-600">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                              {item.categories?.name || 'News'}
                            </p>
                            <h3 className="mt-1 line-clamp-3 text-sm font-semibold leading-6 text-slate-900 dark:text-white">
                              <span className="group-hover:underline group-hover:underline-offset-4">
                                {item.title}
                              </span>
                            </h3>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </aside>
                )}
              </aside>
            </div>
          </article>
        </div>
      </>
    )
  } catch {
    notFound()
  }
}










