import Link from 'next/link'
import Image from 'next/image'
import { Clock3, User } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { createPublicClient } from '@/lib/supabase/public-server'
import PublicHeader from '@/components/layout/PublicHeader'

export const revalidate = 600

export const metadata = {
  title: 'Latest News - EkahNews',
  description: 'Today\'s latest published news on EkahNews.',
}

function getArticleHref(article) {
  return `/${article.categories?.slug || 'news'}/${article.slug}`
}

export default async function LatestNewsPage() {
  const supabase = createPublicClient()

  let categories = []
  let articles = []

  try {
    const [categoriesRes, articlesRes] = await Promise.all([
      supabase
        .from('categories')
        .select('id, name, slug')
        .order('name'),
      supabase
        .from('articles')
        .select(`
          id,
          title,
          slug,
          excerpt,
          featured_image_url,
          published_at,
          authors (name),
          categories (name, slug)
        `)
        .eq('status', 'published')
        .order('published_at', { ascending: false }),
    ])

    categories = categoriesRes.data || []
    articles = articlesRes.data || []
  } catch (error) {
    console.error('Latest news page fetch failed:', error)
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <PublicHeader categories={categories} />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
        <section className="mb-8 border-b border-slate-300 pb-5 dark:border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
            Daily Feed
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-4xl">
            Latest News
          </h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 md:text-base">
            All published articles, ordered from newest to oldest.
          </p>
        </section>

        {articles.length > 0 ? (
          <section className="space-y-4">
            {articles.map((article) => (
              <Link
                key={article.id}
                href={getArticleHref(article)}
                className="grid gap-4 border-b border-slate-200 pb-4 transition-colors hover:bg-slate-50 md:grid-cols-[220px_minmax(0,1fr)] dark:border-slate-800 dark:hover:bg-slate-900/60"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {article.featured_image_url ? (
                    <Image
                      src={article.featured_image_url}
                      alt={article.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 220px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400 dark:text-slate-500">
                      No image
                    </div>
                  )}
                </div>

                <div className="min-w-0 py-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    <span>{article.categories?.name || 'News'}</span>
                    {article.published_at && (
                      <span>{format(new Date(article.published_at), 'MMM d, yyyy')}</span>
                    )}
                  </div>

                  <h2 className="mt-2 text-xl font-bold leading-snug text-slate-900 dark:text-white">
                    {article.title}
                  </h2>

                  {article.excerpt && (
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400 md:text-base">
                      {article.excerpt}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    {article.authors?.name && (
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        {article.authors.name}
                      </span>
                    )}
                    {article.published_at && (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </section>
        ) : (
          <section className="border border-slate-200 bg-white p-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            No published articles are available yet.
          </section>
        )}
      </main>
    </div>
  )
}
