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
        {(contact.email || contact.editorialEmail || contact.correctionsEmail || contact.phone || contact.whatsapp || contact.address) && (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">How to reach us</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300">
              {contact.email && (
                <p>
                  <span className="font-semibold text-slate-900 dark:text-white">General:</span>{' '}
                  <a className="text-blue-600 hover:underline dark:text-blue-400" href={`mailto:${contact.email}`}>
                    {contact.email}
                  </a>
                </p>
              )}
              {contact.editorialEmail && contact.editorialEmail !== contact.email && (
                <p>
                  <span className="font-semibold text-slate-900 dark:text-white">Editorial:</span>{' '}
                  <a className="text-blue-600 hover:underline dark:text-blue-400" href={`mailto:${contact.editorialEmail}`}>
                    {contact.editorialEmail}
                  </a>
                </p>
              )}
              {contact.correctionsEmail && contact.correctionsEmail !== contact.email && contact.correctionsEmail !== contact.editorialEmail && (
                <p>
                  <span className="font-semibold text-slate-900 dark:text-white">Corrections:</span>{' '}
                  <a className="text-blue-600 hover:underline dark:text-blue-400" href={`mailto:${contact.correctionsEmail}`}>
                    {contact.correctionsEmail}
                  </a>
                </p>
              )}
              {contact.phone && (
                <p>
                  <span className="font-semibold text-slate-900 dark:text-white">Phone:</span>{' '}
                  <a className="text-blue-600 hover:underline dark:text-blue-400" href={`tel:${contact.phone}`}>
                    {contact.phone}
                  </a>
                </p>
              )}
              {contact.whatsapp && (
                <p>
                  <span className="font-semibold text-slate-900 dark:text-white">WhatsApp tipline:</span>{' '}
                  {contact.whatsapp}
                </p>
              )}
              {contact.address && (
                <p>
                  <span className="font-semibold text-slate-900 dark:text-white">Address:</span>{' '}
                  {contact.address}
                </p>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
