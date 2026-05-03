import { createOptionalPublicClient } from '@/lib/supabase/public-server'
import PublicHeader from '@/components/layout/PublicHeader'
import Breadcrumb from '@/components/common/Breadcrumb'
import ContentUnavailableNotice from '@/components/common/ContentUnavailableNotice'
import ArticleMiniCard from '@/components/content/ArticleMiniCard'
import WebStoryCard from '@/components/content/WebStoryCard'
import StructuredData from '@/components/seo/StructuredData'
import { absoluteUrl } from '@/lib/site-config'
import { notFound } from 'next/navigation'
import { generateCategoryMetadata } from '@/lib/seo-utils'
import Link from 'next/link'
import Image from 'next/image'
import { BLOCKED_CATEGORY_SLUGS, filterBlockedCategories } from '@/lib/category-utils'
import { getBreadcrumbSchema } from '@/lib/schema'
import { runListQuery, runSingleQuery } from '@/lib/supabase/query-timeout'
import { formatArticleCardDate } from '@/lib/date-utils'

export const revalidate = 900
const PAGE_SIZE = 12
const WEB_STORY_CATEGORY_SLUGS = ['web-story', 'web-stories']

function normalizeArticleItem(article) {
  return {
    ...article,
    _type: 'article',
  }
}

function normalizeWebStoryItem(story) {
  return {
    ...story,
    _type: 'web_story',
  }
}

function sortItemsByPublishedAt(items) {
  return [...items].sort((a, b) => {
    const left = new Date(a?.published_at || 0).getTime()
    const right = new Date(b?.published_at || 0).getTime()
    return right - left
  })
}

function getContentHref(item) {
  return item?._type === 'web_story'
    ? `/web-stories/${item.slug}`
    : `/${item.categories?.slug || 'news'}/${item.slug}`
}

function getContentImage(item) {
  return item?._type === 'web_story' ? item.cover_image : item.featured_image_url
}

function getContentImageAlt(item) {
  return item?._type === 'web_story'
    ? (item.cover_image_alt || item.title || 'Web story cover')
    : (item.title || 'Article image')
}

export async function generateMetadata({ params }) {
  if (BLOCKED_CATEGORY_SLUGS.includes(params.slug)) {
    return {
      title: 'Category Not Found',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const supabase = createOptionalPublicClient()
  const category = await runSingleQuery(
    (signal) => supabase
      .from('categories')
      .select('id, name, slug, description')
      .eq('slug', params.slug)
      .maybeSingle()
      .abortSignal(signal),
    { label: 'generateCategoryMetadata:getCategory' }
  )

  if (!category) {
    return {
      title: 'Category Not Found | EkahNews',
      description: 'Category not found.',
    }
  }

  const isWebStoryCategory = WEB_STORY_CATEGORY_SLUGS.includes(category.slug)
  const counts = isWebStoryCategory
    ? await Promise.all([
      runListQuery(
        (signal) => supabase
          .from('web_stories')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'published')
          .eq('category_id', category.id)
          .abortSignal(signal),
        { label: 'generateCategoryMetadata:getWebStoryCount' }
      ),
    ])
    : await Promise.all([
      runListQuery(
        (signal) => supabase
          .from('articles')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'published')
          .eq('category_id', category.id)
          .abortSignal(signal),
        { label: 'generateCategoryMetadata:getArticleCount' }
      ),
      runListQuery(
        (signal) => supabase
          .from('web_stories')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'published')
          .eq('category_id', category.id)
          .abortSignal(signal),
        { label: 'generateCategoryMetadata:getCategoryWebStoryCount' }
      ),
    ])

  const count = counts.reduce((sum, result) => sum + (result?.count || 0), 0)

  const metadata = generateCategoryMetadata(category)
  if (count === 0) {
    metadata.robots = {
      index: false,
      follow: true,
    }
  }

  return metadata
}

function NewsFeatureCard({ article }) {
  if (!article) return null
  const href = getContentHref(article)
  const imageSrc = getContentImage(article)
  const imageAlt = getContentImageAlt(article)
  const isWebStory = article._type === 'web_story'

  return (
    <div className="space-y-3">
      <Link
        href={href}
        className="group block overflow-hidden"
      >
        <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800 sm:aspect-[16/9] lg:aspect-[16/10]">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={imageAlt}
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
        href={href}
        className="group block px-1 py-2 transition-colors"
      >
        {isWebStory ? (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d62828] dark:text-red-400">
            Web Story
          </p>
        ) : null}
        <h2 className="line-clamp-3 text-[1.3rem] font-extrabold leading-tight tracking-tight text-slate-900 group-hover:underline group-hover:underline-offset-4 dark:text-white sm:text-[1.5rem] md:text-[1.75rem] lg:text-[1.9rem]">
          {article.title}
        </h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
          {article.published_at ? (
            <span>{formatArticleCardDate(article.published_at)}</span>
          ) : null}
          {article.authors?.name ? (
            <span>by {article.authors.name}</span>
          ) : null}
        </div>
      </Link>
    </div>
  )
}

function NewsSidebarCard({ article }) {
  const href = getContentHref(article)
  const imageSrc = getContentImage(article)
  const imageAlt = getContentImageAlt(article)
  const isWebStory = article._type === 'web_story'

  return (
    <Link
      key={article.id}
      href={href}
      className="group grid min-w-0 grid-cols-[minmax(0,1fr)_72px] items-center gap-2 p-2 sm:grid-cols-[minmax(0,1fr)_80px] sm:p-2.5 lg:grid-cols-[minmax(0,1fr)_88px]"
    >
      <div className="min-w-0">
        {isWebStory ? (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d62828] dark:text-red-400">
            Web Story
          </p>
        ) : null}
        <p className="break-words text-[0.92rem] font-medium leading-snug text-slate-900 decoration-current underline-offset-4 group-hover:underline dark:text-white sm:text-[0.98rem]">
          {article.title}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
          {article.published_at ? (
            <span>{formatArticleCardDate(article.published_at)}</span>
          ) : null}
          {article.authors?.name ? (
            <span>by {article.authors.name}</span>
          ) : null}
        </div>
      </div>

      <div className="relative h-[72px] w-[72px] overflow-hidden bg-slate-100 dark:bg-slate-800 sm:h-[80px] sm:w-[80px] lg:h-[88px] lg:w-[88px]">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={imageAlt}
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
  )
}

export default async function CategoryPage({ params }) {
  if (BLOCKED_CATEGORY_SLUGS.includes(params.slug)) {
    notFound()
  }

  const supabase = createOptionalPublicClient()
  if (!supabase) {
    notFound()
  }
  let databaseUnavailable = false

  let category
  try {
    category = await runSingleQuery(
      (signal) => supabase
        .from('categories')
        .select('id, name, slug, description')
        .eq('slug', params.slug)
        .maybeSingle()
        .abortSignal(signal),
      { label: 'getCategoryBySlug', throwOnUnavailable: true }
    )
  } catch (error) {
    if (error.message === 'DATABASE_UNAVAILABLE') {
      databaseUnavailable = true
    } else {
      throw error
    }
  }

  if (!category && !databaseUnavailable) {
    notFound()
  }

  const categoryDisplayName = category?.name || params.slug.replace(/-/g, ' ')
  const categorySlug = category?.slug || params.slug

  const isWebStoryCategory = WEB_STORY_CATEGORY_SLUGS.includes(categorySlug)

  const [{ data: categories }, articlesResult, webStoriesResult] = await Promise.all([
    runListQuery(
      (signal) => supabase.from('categories').select('id, name, slug').order('name').abortSignal(signal),
      { label: 'getCategoryPageCategories' }
    ),
    isWebStoryCategory
      ? Promise.resolve({ data: [], count: 0 })
      : runListQuery(
        (signal) => supabase
          .from('articles')
          .select('id, title, slug, excerpt, featured_image_url, published_at, categories(name, slug), authors(name)', { count: 'exact' })
          .eq('category_id', category?.id || '__missing__')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .range(0, PAGE_SIZE - 1)
          .abortSignal(signal),
        { label: 'getCategoryArticles' }
      ),
    runListQuery(
      (signal) => supabase
        .from('web_stories')
        .select('id, title, slug, cover_image, cover_image_alt, published_at, categories(name, slug), authors(name)', { count: 'exact' })
        .eq('category_id', category?.id || '__missing__')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .range(0, isWebStoryCategory ? PAGE_SIZE - 1 : PAGE_SIZE * 2 - 1)
        .abortSignal(signal),
      { label: 'getCategoryWebStories' }
    ),
  ])
  const filteredCategories = filterBlockedCategories(categories || [])

  const articleItems = isWebStoryCategory ? [] : (articlesResult?.data || []).map(normalizeArticleItem)
  const webStoryItems = (webStoriesResult?.data || []).map(normalizeWebStoryItem)
  const totalCount = isWebStoryCategory
    ? (webStoriesResult?.count || 0)
    : (articlesResult?.count || 0) + (webStoriesResult?.count || 0)
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const latestItems = isWebStoryCategory
    ? webStoryItems
    : sortItemsByPublishedAt([...articleItems, ...webStoryItems]).slice(0, PAGE_SIZE)

  const featuredArticle = latestItems[0]
  const sidebarStories = latestItems.slice(1, 5)
  const gridStories = latestItems.slice(5)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${categoryDisplayName} News`,
    url: absoluteUrl(`/category/${categorySlug}`),
  }
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Home', url: absoluteUrl('/') },
    { name: categoryDisplayName, url: absoluteUrl(`/category/${categorySlug}`) },
  ])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StructuredData data={jsonLd} />
      <StructuredData data={breadcrumbSchema} />
      <PublicHeader categories={filteredCategories} />

      <main className="mx-auto w-full max-w-6xl px-4 py-10 md:py-12">
        <div className="mb-6">
          <Breadcrumb items={[{ label: categoryDisplayName, href: '/category/' + categorySlug }]} />
        </div>
        {databaseUnavailable && (
          <ContentUnavailableNotice
            className="mb-8"
            title={`${categoryDisplayName} is temporarily unavailable`}
            message="We are having trouble loading the latest stories for this section right now. Please try again in a little while."
          />
        )}

        {featuredArticle ? (
          isWebStoryCategory ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
              {latestItems.map((story) => (
                <WebStoryCard key={story.id} story={story} />
              ))}
            </div>
          ) : (
            <section className="space-y-8">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.95fr)] lg:items-start">
                <NewsFeatureCard article={featuredArticle} />

                <div className="p-1 lg:pt-0">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    {sidebarStories.map((article) => (
                      <NewsSidebarCard key={article.id} article={article} />
                    ))}
                  </div>
                </div>
              </div>

              {gridStories.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {gridStories.map((item) => (
                    item._type === 'web_story'
                      ? <WebStoryCard key={`story-${item.id}`} story={item} />
                      : <ArticleMiniCard key={`article-${item.id}`} article={item} compact hideExcerpt squareImage />
                  ))}
                </div>
              ) : null}
            </section>
          )
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            No published stories are available in this section yet.
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-between text-sm">
            <span className="text-gray-400">Previous</span>
            <span className="text-gray-600 dark:text-gray-400">Page 1 of {totalPages}</span>
            <Link href={`/category/${categorySlug}/page/2`} className="text-blue-600 hover:underline">
              Next
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
