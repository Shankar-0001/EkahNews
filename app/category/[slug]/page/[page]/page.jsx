import { createOptionalPublicClient } from '@/lib/supabase/public-server'
import PublicHeader from '@/components/layout/PublicHeader'
import Breadcrumb from '@/components/common/Breadcrumb'
import ArticleMiniCard from '@/components/content/ArticleMiniCard'
import WebStoryCard from '@/components/content/WebStoryCard'
import StructuredData from '@/components/seo/StructuredData'
import { absoluteUrl, getPublicationLogoUrl } from '@/lib/site-config'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { BLOCKED_CATEGORY_SLUGS, filterBlockedCategories } from '@/lib/category-utils'
import { getBreadcrumbSchema } from '@/lib/schema'
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

function toPageNumber(raw) {
  const page = Number.parseInt(raw, 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

function NewsFeatureCard({ article, priority = false }) {
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
              priority={priority}
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
  if (!supabase) {
    return {
      title: 'Category Not Found | EkahNews',
      robots: {
        index: false,
        follow: false,
      },
    }
  }
  const page = toPageNumber(params.page)

  const { data: category } = await supabase
    .from('categories')
    .select('name, slug, description')
    .eq('slug', params.slug)
    .single()

  if (!category) {
    return {
      title: 'Category Not Found | EkahNews',
      description: 'Category not found.',
    }
  }

  const canonical = absoluteUrl(`/category/${category.slug}/page/${page}`)
  const title = `${category.name} News and Updates | Page ${page} | EkahNews`
  const description = category.description
    || `Latest ${category.name} news, updates, and analysis on EkahNews.`
  const ogImage = getPublicationLogoUrl()

  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default async function CategoryPagePaginated({ params }) {
  if (BLOCKED_CATEGORY_SLUGS.includes(params.slug)) {
    notFound()
  }

  const supabase = createOptionalPublicClient()
  if (!supabase) {
    notFound()
  }
  const page = toPageNumber(params.page)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: category } = await supabase
    .from('categories')
    .select('id, name, slug, description')
    .eq('slug', params.slug)
    .single()

  if (!category) {
    notFound()
  }

  const isWebStoryCategory = WEB_STORY_CATEGORY_SLUGS.includes(category.slug)

  const [{ data: categories }, articlesResult, webStoriesResult] = await Promise.all([
    supabase.from('categories').select('id, name, slug').order('name'),
    isWebStoryCategory
      ? Promise.resolve({ data: [], count: 0 })
      : supabase
        .from('articles')
        .select('id, title, slug, excerpt, featured_image_url, published_at, categories(name, slug), authors(name)', { count: 'exact' })
        .eq('category_id', category.id)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .range(0, to),
    supabase
      .from('web_stories')
      .select('id, title, slug, cover_image, cover_image_alt, published_at, categories(name, slug), authors(name)', { count: 'exact' })
      .eq('category_id', category.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(0, isWebStoryCategory ? to : Math.max(to, PAGE_SIZE * 2 - 1)),
  ])
  const filteredCategories = filterBlockedCategories(categories || [])

  const totalCount = isWebStoryCategory
    ? (webStoriesResult?.count || 0)
    : (articlesResult?.count || 0) + (webStoriesResult?.count || 0)
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  if (page > totalPages && totalPages > 0) {
    notFound()
  }

  const articleItems = isWebStoryCategory ? [] : (articlesResult?.data || []).map(normalizeArticleItem)
  const webStoryItems = (webStoriesResult?.data || []).map(normalizeWebStoryItem)
  const latestItems = isWebStoryCategory
    ? webStoryItems.slice(from, to + 1)
    : sortItemsByPublishedAt([...articleItems, ...webStoryItems]).slice(from, to + 1)

  const featuredArticle = latestItems[0]
  const sidebarStories = latestItems.slice(1, 5)
  const gridStories = latestItems.slice(5)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} News`,
    url: absoluteUrl(`/category/${category.slug}/page/${page}`),
  }
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Home', url: absoluteUrl('/') },
    { name: category.name, url: absoluteUrl(`/category/${category.slug}`) },
  ])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StructuredData data={jsonLd} />
      <StructuredData data={breadcrumbSchema} />
      <PublicHeader categories={filteredCategories} />

      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="mb-6">
          <Breadcrumb items={[{ label: category.name, href: '/category/' + category.slug }, { label: 'Page ' + page, href: '/category/' + category.slug + '/page/' + page }]} />
        </div>
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
                <NewsFeatureCard article={featuredArticle} priority={page === 1} />

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
            {page > 1 ? (
              <Link href={`/category/${category.slug}/page/${page - 1}`} className="text-blue-600 hover:underline">
                Previous
              </Link>
            ) : (
              <span className="text-gray-400">Previous</span>
            )}

            <span className="text-gray-600 dark:text-gray-400">Page {page} of {totalPages}</span>

            {page < totalPages ? (
              <Link href={`/category/${category.slug}/page/${page + 1}`} className="text-blue-600 hover:underline">
                Next
              </Link>
            ) : (
              <span className="text-gray-400">Next</span>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
