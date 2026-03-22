import { createClient } from '@/lib/supabase/server'
import PublicHeader from '@/components/layout/PublicHeader'
import ArticleMiniCard from '@/components/content/ArticleMiniCard'
import StructuredData from '@/components/seo/StructuredData'
import { absoluteUrl, getPublicationLogoUrl } from '@/lib/site-config'
import { notFound } from 'next/navigation'

export const revalidate = 900

export async function generateMetadata({ params }) {
  const supabase = await createClient()
  const slug = decodeURIComponent(params.slug)

  const { data: tag } = await supabase
    .from('tags')
    .select('name, slug')
    .eq('slug', slug)
    .single()

  if (!tag) {
    return {
      title: 'Tag Not Found | EkahNews',
      description: 'Tag not found.',
    }
  }

  const canonical = absoluteUrl(`/tags/${tag.slug}`)
  const title = `${tag.name} News and Updates | EkahNews`
  const description = `Latest news, updates, and stories tagged with ${tag.name} on EkahNews.`
  const ogImage = getPublicationLogoUrl()

  return {
    title,
    description,
    alternates: { canonical },
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

export default async function TagPage({ params }) {
  const supabase = await createClient()
  const slug = decodeURIComponent(params.slug)

  const { data: tag } = await supabase
    .from('tags')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!tag) {
    notFound()
  }

  const [{ data: categories }, { data: articles }] = await Promise.all([
    supabase.from('categories').select('id, name, slug').order('name'),
    supabase
      .from('articles')
      .select('id, title, slug, excerpt, featured_image_url, published_at, categories(name, slug), authors(name, slug), article_tags!inner(tag_id)')
      .eq('status', 'published')
      .eq('article_tags.tag_id', tag.id)
      .order('published_at', { ascending: false })
      .limit(30),
  ])
  if (!articles || articles.length === 0) {
    notFound()
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${tag.name} News`,
    url: absoluteUrl(`/tags/${tag.slug}`),
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StructuredData data={jsonLd} />
      <PublicHeader categories={categories || []} />

      <main className="w-full max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{tag.name}</h1>
          <p className="text-gray-600 dark:text-gray-400">Latest stories tagged with {tag.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <ArticleMiniCard key={article.id} article={article} />
          ))}
        </div>
      </main>
    </div>
  )
}


