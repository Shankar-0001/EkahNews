import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PublicHeader from '@/components/layout/PublicHeader'
import StructuredData from '@/components/seo/StructuredData'
import WebStoryViewer from '@/components/content/WebStoryViewer'
import { absoluteUrl, buildLanguageAlternates } from '@/lib/site-config'

export const revalidate = 600

export async function generateMetadata({ params }) {
  const supabase = await createClient()
  const { data: story } = await supabase
    .from('web_stories')
    .select('title, slug, cover_image, slides, cta_text, cta_url, whatsapp_group_url, ad_slot, seo_description')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!story) return { title: 'Story Not Found | EkahNews' }

  const firstDesc = Array.isArray(story.slides) ? story.slides[0]?.description : ''
  const description = story.seo_description || firstDesc || `Visual story: ${story.title}`

  return {
    title: `${story.title} | Web Story`,
    description,
    alternates: {
      canonical: absoluteUrl(`/web-stories/${story.slug}`),
      languages: buildLanguageAlternates(`/web-stories/${story.slug}`),
    },
    openGraph: {
      title: story.title,
      description,
      type: 'article',
      images: story.cover_image ? [{ url: story.cover_image, width: 1200, height: 2133, alt: story.title }] : [],
      url: absoluteUrl(`/web-stories/${story.slug}`),
    },
    twitter: {
      card: 'summary_large_image',
      title: story.title,
      description,
      images: story.cover_image ? [story.cover_image] : [],
    },
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
    },
  }
}

export default async function WebStoryDetailPage({ params }) {
  const supabase = await createClient()

  const [{ data: categories }, { data: story }] = await Promise.all([
    supabase.from('categories').select('id, name, slug').order('name'),
    supabase
      .from('web_stories')
      .select('id, title, slug, cover_image, slides, related_article_slug, cta_text, cta_url, whatsapp_group_url, ad_slot, seo_description, created_at, updated_at, authors(name, slug), categories(name, slug)')
      .eq('slug', params.slug)
      .maybeSingle(),
  ])

  if (!story) notFound()

  const articleUrl = story.related_article_slug
    ? absoluteUrl(`/${story.categories?.slug || 'news'}/${story.related_article_slug}`)
    : ''

  const ldArticle = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: story.title,
    description: story.seo_description || (Array.isArray(story.slides) ? story.slides[0]?.description || story.title : story.title),
    image: story.cover_image ? [story.cover_image] : [],
    author: { '@type': 'Person', name: story.authors?.name || 'EkahNews' },
    datePublished: story.created_at,
    dateModified: story.updated_at || story.created_at,
    mainEntityOfPage: absoluteUrl(`/web-stories/${story.slug}`),
    publisher: {
      '@type': 'Organization',
      name: 'EkahNews',
      logo: { '@type': 'ImageObject', url: absoluteUrl('/logo.png') },
    },
  }

  const ldPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: story.title,
    url: absoluteUrl(`/web-stories/${story.slug}`),
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StructuredData data={ldArticle} />
      <StructuredData data={ldPage} />
      <PublicHeader categories={categories || []} />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-center text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-6">{story.title}</h1>
        <WebStoryViewer story={story} articleUrl={articleUrl} />
      </main>
    </div>
  )
}

