import { createClient } from '@/lib/supabase/server'
import SafeHtml from '@/components/SafeHtml'
import PublicHeader from '@/components/layout/PublicHeader'
import StructuredData from '@/components/seo/StructuredData'
import { absoluteUrl, getPublicationContactInfo } from '@/lib/site-config'
import { getRenderableHtml, getStaticPageDefinition, getStaticPageOverride } from '@/lib/static-pages'
import { filterBlockedCategories } from '@/lib/category-utils'

export async function generateMetadata() {
  const definition = getStaticPageDefinition('editorial-policy')
  const override = await getStaticPageOverride('editorial-policy')

  return {
    title: override?.seo_title || definition?.seoTitle || 'Editorial Policy - EkahNews',
    description: override?.seo_description
      || definition?.seoDescription
      || 'Read EkahNews editorial standards, sourcing guidelines, and content policies.',
  }
}

export default async function EditorialPolicyPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')
  const filteredCategories = filterBlockedCategories(categories || [])

  const override = await getStaticPageOverride('editorial-policy')
  const pageTitle = override?.title || 'Editorial Policy'
  const contentHtml = override?.content_html ? getRenderableHtml(override.content_html) : null
  const pageUrl = absoluteUrl('/editorial-policy')
  const contact = getPublicationContactInfo()
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
              EkahNews is committed to factual, fair, and transparent journalism. Our reporting is guided by
              verification, accountability, and independence from outside influence.
            </p>
            <p>
              We prioritize primary sources, corroboration, and clear attribution. When new information emerges, we
              update coverage promptly and note significant changes.
            </p>
            <p>
              Opinions, analysis, and explainers are labeled clearly. Sponsored content and advertisements are separated
              from editorial content.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
