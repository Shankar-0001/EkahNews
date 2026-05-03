import { createClient } from '@/lib/supabase/server'
import PublicHeader from '@/components/layout/PublicHeader'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { absoluteUrl } from '@/lib/site-config'
import { filterBlockedCategories } from '@/lib/category-utils'

export const revalidate = 900

export const metadata = {
  title: 'Tags | EkahNews',
  description: 'Browse all editorial tags published on EkahNews.',
  alternates: {
    canonical: absoluteUrl('/tags'),
  },
  openGraph: {
    title: 'Tags | EkahNews',
    description: 'Browse all editorial tags published on EkahNews.',
    url: absoluteUrl('/tags'),
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tags | EkahNews',
    description: 'Browse all editorial tags published on EkahNews.',
  },
}

export default async function TagsIndexPage() {
  const supabase = await createClient()

  const [{ data: categories }, { data: tags }, { data: articleTagLinks }, { data: webStoryTagLinks }] = await Promise.all([
    supabase.from('categories').select('id, name, slug').order('name'),
    supabase.from('tags').select('id, name, slug').order('name'),
    supabase
      .from('article_tags')
      .select('tag_id, articles!inner(status)')
      .eq('articles.status', 'published'),
    supabase
      .from('web_story_tags')
      .select('tag_id, web_stories!inner(status)')
      .eq('web_stories.status', 'published'),
  ])
  const filteredCategories = filterBlockedCategories(categories || [])

  if (!tags) {
    notFound()
  }

  const tagCounts = new Map()
  for (const row of articleTagLinks || []) {
    if (!row?.tag_id) continue
    tagCounts.set(row.tag_id, (tagCounts.get(row.tag_id) || 0) + 1)
  }
  for (const row of webStoryTagLinks || []) {
    if (!row?.tag_id) continue
    tagCounts.set(row.tag_id, (tagCounts.get(row.tag_id) || 0) + 1)
  }

  const sortedTags = (tags || [])
    .map((tag) => ({ ...tag, storyCount: tagCounts.get(tag.id) || 0 }))
    .filter((tag) => tag.storyCount > 0)
    .sort((a, b) => {
      if (b.storyCount !== a.storyCount) return b.storyCount - a.storyCount
      return a.name.localeCompare(b.name)
    })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PublicHeader categories={filteredCategories} />
      <main className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tags</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Browse all tags</p>
        <div className="flex flex-wrap gap-2">
          {sortedTags.map((tag) => (
            <Link
              key={tag.id}
              href={`/tags/${tag.slug}`}
              className="px-3 py-1.5 rounded-full border text-sm text-blue-700 dark:text-blue-300 hover:underline"
            >
              {tag.name} ({tag.storyCount} {tag.storyCount === 1 ? 'story' : 'stories'})
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
