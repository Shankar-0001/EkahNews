import { createOptionalPublicClient } from '@/lib/supabase/public-server'
import PublicHeader from '@/components/layout/PublicHeader'
import WebStoryCard from '@/components/content/WebStoryCard'
import ContentUnavailableNotice from '@/components/common/ContentUnavailableNotice'
import Breadcrumb from '@/components/common/Breadcrumb'
import { absoluteUrl, getPublicationLogoUrl } from '@/lib/site-config'
import StructuredData from '@/components/seo/StructuredData'
import { filterBlockedCategories } from '@/lib/category-utils'
import { runListQuery } from '@/lib/supabase/query-timeout'

export const revalidate = 900

export const metadata = {
  title: 'Web Stories | EkahNews',
  description: 'Visual, swipeable Web Stories from EkahNews with the latest news, explainers, and updates.',
  alternates: {
    canonical: absoluteUrl('/web-stories'),
  },
  openGraph: {
    title: 'Web Stories | EkahNews',
    description: 'Visual, swipeable Web Stories from EkahNews.',
    type: 'website',
    url: absoluteUrl('/web-stories'),
    images: [{ url: getPublicationLogoUrl() }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Web Stories | EkahNews',
    description: 'Visual, swipeable Web Stories from EkahNews.',
    images: [getPublicationLogoUrl()],
  },
}

export default async function WebStoriesPage() {
  const supabase = createOptionalPublicClient()

  const [{ data: categories }, { data: stories }] = await Promise.all([
    supabase
      ? runListQuery(
        (signal) => supabase.from('categories').select('id, name, slug').order('name').abortSignal(signal),
        { label: 'fetchWebStoryCategories' }
      )
      : Promise.resolve({ data: [] }),
    supabase
      ? runListQuery(
        (signal) => supabase
          .from('web_stories')
          .select('id, title, slug, cover_image, cover_image_alt, published_at, authors(name), categories(name, slug)')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(24)
          .abortSignal(signal),
        { label: 'fetchWebStories' }
      )
      : Promise.resolve({ data: [] }),
  ])
  const filteredCategories = filterBlockedCategories(categories || [])

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Web Stories',
    url: absoluteUrl('/web-stories'),
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StructuredData data={schema} />
      <PublicHeader categories={filteredCategories} />

      <main className="w-full max-w-6xl mx-auto px-4 py-10">
        <div className="mb-6">
          <Breadcrumb items={[{ label: 'Web Stories', href: '/web-stories' }]} />
        </div>
        {!stories?.length && (
          <ContentUnavailableNotice
            className="mb-8"
            title="Web stories are temporarily unavailable"
            message="We are having trouble loading visual stories right now. Please try again in a little while."
          />
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {stories?.map((story) => (
            <WebStoryCard key={story.id} story={story} />
          ))}
        </div>
      </main>
    </div>
  )
}
