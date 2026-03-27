import { createPublicClient } from '@/lib/supabase/public-server'
import PublicHeader from '@/components/layout/PublicHeader'
import ArticleMiniCard from '@/components/content/ArticleMiniCard'
import { notFound } from 'next/navigation'
import { absoluteUrl } from '@/lib/site-config'

export const revalidate = 900

export async function generateMetadata({ searchParams }) {
  const query = searchParams?.q?.trim()

  return {
    title: query ? `Search results for "${query}" | EkahNews` : 'Search | EkahNews',
    description: query ? `Search results for ${query} on EkahNews.` : 'Search EkahNews content.',
    alternates: { canonical: absoluteUrl('/search') },
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default async function SearchPage({ searchParams }) {
  const query = searchParams?.q
  const supabase = createPublicClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')

  if (!query) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <PublicHeader categories={categories || []} />
        <div className="max-w-6xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Search</h1>
          <p className="text-gray-600 dark:text-gray-400">Please enter a search term.</p>
        </div>
      </div>
    )
  }

  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, published_at, categories(name, slug), authors(name)')
    .eq('status', 'published')
    .ilike('title', `%${query}%`)
    .order('published_at', { ascending: false })
    .limit(10)

  if (error) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PublicHeader categories={categories || []} />
      <main className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{`Search results for "${query}"`}</h1>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles && articles.length > 0 ? (
            articles.map((article) => (
              <ArticleMiniCard key={article.id} article={article} />
            ))
          ) : (
            <p className="text-gray-600 dark:text-gray-400">No articles found.</p>
          )}
        </div>
      </main>
    </div>
  )
}

