import { publishedArticleFromHistory } from '@/lib/article-history.mjs'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'

export const revalidate = 600

export default async function LegacyArticleRedirectPage({ params }) {
  const supabase = await createClient()
  const slug = params.slug

  let { data: article } = await supabase
    .from('articles')
    .select('slug, categories:categories!articles_category_id_fkey(slug)')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (!article) article = await publishedArticleFromHistory(supabase,slug)

  if (!article) notFound()

  redirect(`/${article.categories?.slug || 'news'}/${article.slug}`)
}

