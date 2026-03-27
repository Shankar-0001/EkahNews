import { createClient } from '@/lib/supabase/server'
import PublicHeader from '@/components/layout/PublicHeader'
import Breadcrumb from '@/components/common/Breadcrumb'
import ArticleMiniCard from '@/components/content/ArticleMiniCard'
import WebStoryCard from '@/components/content/WebStoryCard'
import StructuredData from '@/components/seo/StructuredData'
import { absoluteUrl, getPublicationLogoUrl } from '@/lib/site-config'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'

export const revalidate = 900
const PAGE_SIZE = 12

function toPageNumber(raw) {
  const page = Number.parseInt(raw, 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

function NewsFeatureCard({ article, priority = false }) {
  if (!article) return null

  return (
    <div className="space-y-3">
      <a
        href={`/${article.categories?.slug || 'news'}/${article.slug}`}
        className="group block overflow-hidden"
      >
        <div className="relative aspect-[16/10] bg-slate-100 dark:bg-slate-800 sm:aspect-[16/9] lg:aspect-[16/10]">
          {article.featured_image_url ? (
            <Image
              src={article.featured_image_url}
              alt={article.title}
              fill
              priority={priority}
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              sizes="(max-width: 1023px) 100vw, (max-width: 1280px) 60vw, 62vw"
            />
          ) : (
            <div className="h-full w-full" aria-hidden="true" />
          )}
        </div>
      </a>

      <a
        href={`/${article.categories?.slug || 'news'}/${article.slug}`}
        className="group block px-1 py-2 transition-colors"
      >
        <h1 className="line-clamp-3 text-[1.3rem] font-extrabold leading-tight tracking-tight text-slate-900 group-hover:underline group-hover:underline-offset-4 dark:text-white sm:text-[1.5rem] md:text-[1.75rem] lg:text-[1.9rem]">
          {article.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
          {article.published_at ? (
            <span>{formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}</span>
          ) : null}
          {article.authors?.name ? (
            <span>by {article.authors.name}</span>
          ) : null}
        </div>
      </a>
    </div>
  )
}

function NewsSidebarCard({ article }) {
  return (
    <a
      key={article.id}
      href={`/${article.categories?.slug || 'news'}/${article.slug}`}
      className="group grid min-w-0 grid-cols-[minmax(0,1fr)_72px] items-center gap-2 p-2 sm:grid-cols-[minmax(0,1fr)_80px] sm:p-2.5 lg:grid-cols-[minmax(0,1fr)_88px]"
    >
      <div className="min-w-0">
        <p className="break-words text-[0.92rem] font-medium leading-snug text-slate-900 decoration-current underline-offset-4 group-hover:underline dark:text-white sm:text-[0.98rem]">
          {article.title}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
          {article.published_at ? (
            <span>{formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}</span>
          ) : null}
          {article.authors?.name ? (
            <span>by {article.authors.name}</span>
          ) : null}
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
    </a>
  )
}

export async function generateMetadata({ params }) {
  const supabase = await createClient()
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
  const supabase = await createClient()
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

  const isWebStoryCategory = ['web-story', 'web-stories'].includes(category.slug)

  const itemsQuery = isWebStoryCategory
    ? supabase
      .from('web_stories')
      .select('id, title, slug, cover_image, cover_image_alt, published_at, categories(name, slug), authors(name)', { count: 'exact' })
      .eq('category_id', category.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(from, to)
    : supabase
      .from('articles')
      .select('id, title, slug, excerpt, featured_image_url, published_at, categories(name, slug), authors(name)', { count: 'exact' })
      .eq('category_id', category.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(from, to)

  const [{ data: categories }, { data: items, count }, { data: engagementRows }] = await Promise.all([
    supabase.from('categories').select('id, name, slug').order('name'),
    itemsQuery,
    supabase.from('article_engagement').select('article_id, views, likes, shares').limit(10),
  ])

  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE))
  if (page > totalPages && totalPages > 0) {
    notFound()
  }

  const scoreMap = new Map((engagementRows || []).map((row) => [row.article_id, (row.views || 0) + (row.likes || 0) * 3 + (row.shares || 0) * 5]))
  const latestArticles = items || []
  const trending = [...latestArticles]
    .map((item) => ({ ...item, _score: scoreMap.get(item.id) || 0 }))
    .sort((a, b) => b._score - a._score)

  const featuredArticle = isWebStoryCategory ? latestArticles[0] : latestArticles[0] || trending[0]
  const sidebarStories = isWebStoryCategory ? [] : latestArticles.slice(1, 5)
  const gridStories = isWebStoryCategory ? latestArticles.slice(1) : latestArticles.slice(5)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} News`,
    url: absoluteUrl(`/category/${category.slug}/page/${page}`),
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StructuredData data={jsonLd} />
      <PublicHeader categories={categories || []} />

      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="mb-6">
          <Breadcrumb items={[{ label: category.name, href: '/category/' + category.slug }, { label: 'Page ' + page, href: '/category/' + category.slug + '/page/' + page }]} />
        </div>

        {featuredArticle ? (
          isWebStoryCategory ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
              {latestArticles.map((story) => (
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
                  {gridStories.map((article) => (
                    <ArticleMiniCard key={article.id} article={article} compact hideExcerpt squareImage />
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
              <a href={`/category/${category.slug}/page/${page - 1}`} className="text-blue-600 hover:underline">
                Previous
              </a>
            ) : (
              <span className="text-gray-400">Previous</span>
            )}

            <span className="text-gray-600 dark:text-gray-400">Page {page} of {totalPages}</span>

            {page < totalPages ? (
              <a href={`/category/${category.slug}/page/${page + 1}`} className="text-blue-600 hover:underline">
                Next
              </a>
            ) : (
              <span className="text-gray-400">Next</span>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
