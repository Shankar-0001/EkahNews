import { createClient } from '@/lib/supabase/server'
import SafeHtml from '@/components/SafeHtml'
import PublicHeader from '@/components/layout/PublicHeader'
import StructuredData from '@/components/seo/StructuredData'
import { absoluteUrl } from '@/lib/site-config'
import { getRenderableHtml, getStaticPageDefinition, getStaticPageOverride } from '@/lib/static-pages'
import { filterBlockedCategories } from '@/lib/category-utils'

export async function generateMetadata() {
  const definition = getStaticPageDefinition('advertise')
  const override = await getStaticPageOverride('advertise')

  return {
    title: override?.seo_title || definition?.seoTitle || 'Advertise With Us - EkahNews',
    description: override?.seo_description
      || definition?.seoDescription
      || 'Partner with EkahNews to reach engaged readers across key news categories.',
  }
}

export default async function AdvertisePage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')
  const filteredCategories = filterBlockedCategories(categories || [])

  const override = await getStaticPageOverride('advertise')
  const pageTitle = override?.title || 'Advertise With Us'
  const contentHtml = override?.content_html ? getRenderableHtml(override.content_html) : null
  const pageUrl = absoluteUrl('/advertise')

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: pageTitle,
    url: pageUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: 'EkahNews',
      url: absoluteUrl('/'),
    },
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StructuredData data={schema} />
      <PublicHeader categories={filteredCategories} />
      <main className="w-full max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{pageTitle}</h1>
        {contentHtml ? (
          <SafeHtml
            html={contentHtml}
            className="static-page-content mt-6 max-w-none"
          />
        ) : (
          <div className="mt-6 space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              EkahNews offers brand-safe placements and engaged audiences across major news categories. We work with
              partners to build sponsorships that respect editorial independence.
            </p>
            <p>
              For media kits, audience insights, and advertising options, please contact our partnerships team with your
              campaign goals and timeline.
            </p>
            <p>
              We review every request and will respond with available options, pricing, and recommended placements.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
