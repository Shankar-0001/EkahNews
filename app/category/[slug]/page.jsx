import { createClient } from '@/lib/supabase/server'
import PublicHeader from '@/components/layout/PublicHeader'
import ArticleMiniCard from '@/components/content/ArticleMiniCard'
import StructuredData from '@/components/seo/StructuredData'
import { absoluteUrl } from '@/lib/site-config'
import { notFound } from 'next/navigation'
import { generateCategoryMetadata } from '@/lib/seo-utils'
import { ArrowRight, Sparkles, TrendingUp } from 'lucide-react'
import Link from 'next/link'

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

      <main className="w-full max-w-6xl mx-auto px-4 py-10 md:py-12">
        <section className="mb-10 rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_34%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] p-6 md:p-8 shadow-sm dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.14),_transparent_24%),linear-gradient(180deg,_#0f172a_0%,_#020617_100%)]">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_320px] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Category Front</p>
              <h1 className="mt-2 text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">{category.name}</h1>
              <p className="mt-4 max-w-2xl text-base md:text-lg text-gray-600 dark:text-gray-300">
                {category.description || `Latest stories, explainers, and updates from ${category.name}.`}
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-orange-500 mb-3">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Category Snapshot</span>
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{count || 0}</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">published stories in this section</p>
            </div>
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_320px]">
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Coverage</p>
                <h2 className="mt-1 text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Top stories in {category.name}</h2>
              </div>
              {totalPages > 1 && (
                <Link href={`/category/${category.slug}/page/2`} className="hidden md:inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                  More stories <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {trending.map((article) => (
                <ArticleMiniCard key={article.id} article={article} />
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Explore Sections</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {(categories || []).map((item) => (
                  <Link
                    key={item.id}
                    href={`/category/${item.slug}`}
                    className={`rounded-full border px-3 py-2 text-sm transition-colors ${item.slug === category.slug ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>


          </aside>
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
