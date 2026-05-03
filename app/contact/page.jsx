import { createClient } from '@/lib/supabase/server'
import SafeHtml from '@/components/SafeHtml'
import PublicHeader from '@/components/layout/PublicHeader'
import StructuredData from '@/components/seo/StructuredData'
import { absoluteUrl, getPublicationContactInfo } from '@/lib/site-config'
import { getRenderableHtml, getStaticPageDefinition, getStaticPageOverride } from '@/lib/static-pages'
import { filterBlockedCategories } from '@/lib/category-utils'

export async function generateMetadata() {
  const definition = getStaticPageDefinition('contact')
  const override = await getStaticPageOverride('contact')

  return {
    title: override?.seo_title || definition?.seoTitle || 'Contact - EkahNews',
    description: override?.seo_description
      || definition?.seoDescription
      || 'Contact the EkahNews editorial and support teams.',
    alternates: {
      canonical: absoluteUrl('/contact'),
    },
  }
}

export default async function ContactPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')
  const filteredCategories = filterBlockedCategories(categories || [])

  const override = await getStaticPageOverride('contact')
  const pageTitle = override?.title || 'Contact'
  const contentHtml = override?.content_html ? getRenderableHtml(override.content_html) : null
  const pageUrl = absoluteUrl('/contact')
  const contact = getPublicationContactInfo()
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: pageTitle,
    url: pageUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: 'EkahNews',
      url: absoluteUrl('/'),
    },
    ...(contact.email || contact.phone ? {
      mainEntity: {
        '@type': 'Organization',
        name: 'EkahNews',
        url: absoluteUrl('/'),
        ...(contact.email ? { email: contact.email } : {}),
        ...(contact.phone ? { telephone: contact.phone } : {}),
      },
    } : {}),
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StructuredData data={schema} />
      <PublicHeader categories={filteredCategories} />
      <main className="w-full max-w-6xl mx-auto px-4 py-10">
        {contentHtml ? (
          <SafeHtml
            html={contentHtml}
            className="static-page-content max-w-none"
          />
        ) : (
          <div className="space-y-4 text-gray-700 dark:text-gray-300">
            <p>
              For editorial feedback, corrections, or general inquiries, please reach out to our newsroom team.
            </p>
            <p>
              To report a technical issue with the site, include the article URL and a brief description of the problem.
            </p>
            <p>
              We review messages regularly and respond as quickly as possible.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
