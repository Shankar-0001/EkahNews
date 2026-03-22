import { createClient } from '@/lib/supabase/server'
import SafeHtml from '@/components/SafeHtml'
import PublicHeader from '@/components/layout/PublicHeader'
import StructuredData from '@/components/seo/StructuredData'
import { absoluteUrl, getPublicationContactInfo } from '@/lib/site-config'
import { getRenderableHtml, getStaticPageDefinition, getStaticPageOverride } from '@/lib/static-pages'

export async function generateMetadata() {
  const definition = getStaticPageDefinition('contact')
  const override = await getStaticPageOverride('contact')

  return {
    title: override?.seo_title || definition?.seoTitle || 'Contact - EkahNews',
    description: override?.seo_description
      || definition?.seoDescription
      || 'Contact the EkahNews editorial and support teams.',
  }
}

export default async function ContactPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')

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
      <PublicHeader categories={categories || []} />
      <main className="w-full max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{pageTitle}</h1>
        {contentHtml ? (
          <SafeHtml
            html={contentHtml}
            className="mt-6 prose prose-slate dark:prose-invert max-w-none"
          />
        ) : (
          <div className="mt-6 space-y-4 text-gray-700 dark:text-gray-300">
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
        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Newsroom</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <p>Email: {contact.editorialEmail || contact.email || 'Not configured yet'}</p>
              {contact.phone && <p>Phone: {contact.phone}</p>}
              {contact.whatsapp && <p>WhatsApp tipline: {contact.whatsapp}</p>}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Corrections</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <p>Email: {contact.correctionsEmail || contact.email || 'Use the contact form details above'}</p>
              {contact.address && <p>Address: {contact.address}</p>}
              {!contact.address && <p>Share the article URL and a short explanation so the team can review it quickly.</p>}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

