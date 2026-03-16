import { createClient } from '@/lib/supabase/server'
import PublicHeader from '@/components/layout/PublicHeader'
import ArticleMiniCard from '@/components/content/ArticleMiniCard'
import StructuredData from '@/components/seo/StructuredData'
import { absoluteUrl } from '@/lib/site-config'
import { notFound } from 'next/navigation'
import { generateCategoryMetadata } from '@/lib/seo-utils'

export const revalidate = 900
const PAGE_SIZE = 12

export async function generateMetadata({ params }) {
  const supabase = await createClient()
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

  return generateCategoryMetadata(category)
}

export default async function CategoryPage({ params }) {
  const supabase = await createClient()

  const { data: category } = await supabase
    .from('categories')
    .select('id, name, slug, description')
    .eq('slug', params.slug)
    .single()

  if (!category) {
    notFound()
  }

  const [{ data: categories }, { data: articles, count }, { data: engagementRows }] = await Promise.all([
    supabase.from('categories').select('id, name, slug').order('name'),
    supabase
      .from('articles')
      .select('id, title, slug, excerpt, featured_image_url, published_at, categories(name, slug), authors(name)', { count: 'exact' })
      .eq('category_id', category.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(0, PAGE_SIZE - 1),
    supabase.from('article_engagement').select('article_id, views, likes, shares').limit(10),
  ])

  const totalPages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE))
  const scoreMap = new Map((engagementRows || []).map((row) => [row.article_id, (row.views || 0) + (row.likes || 0) * 3 + (row.shares || 0) * 5]))

  const trending = [...(articles || [])]
    .map((item) => ({ ...item, _score: scoreMap.get(item.id) || 0 }))
    .sort((a, b) => b._score - a._score)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.name} News`,
    url: absoluteUrl(`/category/${category.slug}`),
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StructuredData data={jsonLd} />
      <PublicHeader categories={categories || []} />

      <main className="w-full max-w-6xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{category.name}</h1>
          <p className="text-gray-600 dark:text-gray-400">Latest stories from {category.name}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trending.map((article) => (
            <ArticleMiniCard key={article.id} article={article} />
          ))}
        </div>

        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-between text-sm">
            <span className="text-gray-400">Previous</span>
            <span className="text-gray-600 dark:text-gray-400">Page 1 of {totalPages}</span>
            <a href={`/category/${category.slug}/page/2`} className="text-blue-600 hover:underline">
              Next
            </a>
          </div>
        )}
      </main>
    </div>
  )
}

