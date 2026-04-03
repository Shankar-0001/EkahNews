import { createOptionalPublicClient } from '@/lib/supabase/public-server'
import PublicHeader from '@/components/layout/PublicHeader'
import WebStoryCard from '@/components/content/WebStoryCard'
import Breadcrumb from '@/components/common/Breadcrumb'
import { absoluteUrl, getPublicationLogoUrl } from '@/lib/site-config'
import StructuredData from '@/components/seo/StructuredData'

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
      ? supabase.from('categories').select('id, name, slug').order('name')
      : Promise.resolve({ data: [] }),
    supabase
      ? supabase
        .from('web_stories')
        .select('id, title, slug, cover_image, cover_image_alt, published_at, authors(name), categories(name, slug)')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(24)
      : Promise.resolve({ data: [] }),
  ])

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Web Stories',
    url: absoluteUrl('/web-stories'),
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StructuredData data={schema} />
      <PublicHeader categories={categories || []} />

      <main className="w-full max-w-6xl mx-auto px-4 py-10">
        <div className="mb-6">
          <Breadcrumb items={[{ label: 'Web Stories', href: '/web-stories' }]} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Web Stories</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Swipeable visual news stories built for fast mobile reading.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {stories?.map((story) => (
            <WebStoryCard key={story.id} story={story} />
          ))}
        </div>
      </main>
    </div>
  )
}


