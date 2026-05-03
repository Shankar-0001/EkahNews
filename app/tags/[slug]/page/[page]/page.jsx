import { createClient } from '@/lib/supabase/server'
import PublicHeader from '@/components/layout/PublicHeader'
import ArticleMiniCard from '@/components/content/ArticleMiniCard'
import WebStoryCard from '@/components/content/WebStoryCard'
import StructuredData from '@/components/seo/StructuredData'
import { absoluteUrl, getPublicationLogoUrl } from '@/lib/site-config'
import { notFound } from 'next/navigation'
import { filterBlockedCategories } from '@/lib/category-utils'
import { getBreadcrumbSchema } from '@/lib/schema'
import Link from 'next/link'

export const revalidate = 900
const PAGE_SIZE = 20

async function getPublishedTagContentCount(supabase, tagId) {
  const [{ count: articleCount }, { count: webStoryCount }] = await Promise.all([
    supabase
      .from('articles')
      .select('id, article_tags!inner(tag_id)', { count: 'exact', head: true })
      .eq('status', 'published')
      .eq('article_tags.tag_id', tagId),
    supabase
      .from('web_stories')
      .select('id, web_story_tags!inner(tag_id)', { count: 'exact', head: true })
      .eq('status', 'published')
      .eq('web_story_tags.tag_id', tagId),
  ])

  return (articleCount || 0) + (webStoryCount || 0)
}

async function getPublishedTagArticleCount(supabase, tagId) {
  const { count } = await supabase
    .from('articles')
    .select('id, article_tags!inner(tag_id)', { count: 'exact', head: true })
    .eq('status', 'published')
    .eq('article_tags.tag_id', tagId)

  return count || 0
}

function toPageNumber(raw) {
  const page = Number.parseInt(raw, 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

export async function generateMetadata({ params }) {
  const supabase = await createClient()
  const slug = decodeURIComponent(params.slug)
  const page = toPageNumber(params.page)

  const { data: tag } = await supabase
    .from('tags')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle()

  if (!tag) {
    return {
      title: 'Tag Not Found | EkahNews',
      description: 'Tag not found.',
    }
  }

  const count = await getPublishedTagContentCount(supabase, tag.id)

  const canonical = absoluteUrl(page > 1 ? `/tags/${tag.slug}/page/${page}` : `/tags/${tag.slug}`)
  const title = page > 1
    ? `${tag.name} - Latest News | Page ${page} | EkahNews`
    : `${tag.name} - Latest News | EkahNews`
  const description = `Latest news and updates about ${tag.name}`
  const ogImage = getPublicationLogoUrl()

  return {
    title,
    description,
    alternates: { canonical },
    robots: {
      index: (count || 0) >= 3,
      follow: true,
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

export default async function TagPagePaginated({ params }) {
  const supabase = await createClient()
  const slug = decodeURIComponent(params.slug)
  const page = toPageNumber(params.page)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: tag } = await supabase
    .from('tags')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!tag) {
    notFound()
  }

  const [{ data: categories }, { data: articles, count }, { data: webStories, count: webStoryCount }] = await Promise.all([
    supabase.from('categories').select('id, name, slug').order('name'),
    supabase
      .from('articles')
      .select('id, title, slug, excerpt, featured_image_url, published_at, categories(name, slug), authors(name, slug), article_tags!inner(tag_id)', { count: 'exact' })
      .eq('status', 'published')
      .eq('article_tags.tag_id', tag.id)
      .order('published_at', { ascending: false })
      .range(from, to),
    supabase
      .from('web_stories')
      .select('id, title, slug, cover_image, cover_image_alt, published_at, web_story_tags!inner(tag_id)', { count: 'exact' })
      .eq('status', 'published')
      .eq('web_story_tags.tag_id', tag.id)
      .order('published_at', { ascending: false })
      .limit(6),
  ])

  const filteredCategories = filterBlockedCategories(categories || [])
  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE))
  if (page > totalPages && totalPages > 0) {
    notFound()
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${tag.name} Articles`,
    url: absoluteUrl(`/tags/${tag.slug}`),
    numberOfItems: (count || 0) + (webStoryCount || 0),
  }
  const breadcrumbSchema = getBreadcrumbSchema([
    { name: 'Home', url: absoluteUrl('/') },
    { name: 'Tags', url: absoluteUrl('/tags') },
    { name: tag.name, url: absoluteUrl(`/tags/${tag.slug}`) },
  ])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StructuredData data={jsonLd} />
      <StructuredData data={breadcrumbSchema} />
      <PublicHeader categories={filteredCategories} />

      <main className="w-full max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{tag.name}</h1>
          <p className="text-gray-600 dark:text-gray-400">Latest stories tagged with {tag.name}</p>
        </div>

        {(webStories || []).length > 0 ? (
          <section className="mb-10">
            <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Web Stories</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
              {webStories.map((story) => (
                <WebStoryCard key={story.id} story={story} />
              ))}
            </div>
          </section>
        ) : null}

        {(articles || []).length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <ArticleMiniCard key={article.id} article={article} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-between text-sm">
                {page > 1 ? (
                  <Link href={page === 2 ? `/tags/${tag.slug}` : `/tags/${tag.slug}/page/${page - 1}`} className="text-blue-600 hover:underline">
                    Previous
                  </Link>
                ) : (
                  <span className="text-gray-400">Previous</span>
                )}

                <span className="text-gray-600 dark:text-gray-400">Page {page} of {totalPages}</span>

                {page < totalPages ? (
                  <Link href={`/tags/${tag.slug}/page/${page + 1}`} className="text-blue-600 hover:underline">
                    Next
                  </Link>
                ) : (
                  <span className="text-gray-400">Next</span>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            No published stories are tagged with this topic yet.
          </div>
        )}
      </main>
    </div>
  )
}
