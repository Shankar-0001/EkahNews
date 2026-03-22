import { createClient } from '@/lib/supabase/server'
import SafeHtml from '@/components/SafeHtml'
import PublicHeader from '@/components/layout/PublicHeader'
import StructuredData from '@/components/seo/StructuredData'
import { absoluteUrl, getPublicationContactInfo } from '@/lib/site-config'
import { getRenderableHtml, getStaticPageDefinition, getStaticPageOverride } from '@/lib/static-pages'

export async function generateMetadata() {
  const definition = getStaticPageDefinition('corrections-policy')
  const override = await getStaticPageOverride('corrections-policy')

  return {
    title: override?.seo_title || definition?.seoTitle || 'Corrections Policy - EkahNews',
    description: override?.seo_description
      || definition?.seoDescription
      || 'How EkahNews handles corrections, clarifications, and updates.',
  }
}

export default async function CorrectionsPolicyPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')

  const override = await getStaticPageOverride('corrections-policy')
  const pageTitle = override?.title || 'Corrections Policy'
  const contentHtml = override?.content_html ? getRenderableHtml(override.content_html) : null
  const pageUrl = absoluteUrl('/corrections-policy')
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
              EkahNews corrects factual errors as quickly as possible. When we update a story, we note significant
              changes to help readers understand what was modified.
            </p>
            <p>
              If you believe an article contains an error, please contact us with the URL and a clear explanation of the
              issue. Our editorial team will review and respond promptly.
            </p>
            <p>
              Clarifications that do not change the overall understanding of a story may be added without a formal
              correction note.
            </p>
          </div>
        )}
        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">How To Report An Issue</h2>
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            <p>Include the article URL, the specific line or claim in question, and the best supporting source you have.</p>
            <p>Corrections contact: {contact.correctionsEmail || contact.email || 'Use the main contact page if no dedicated corrections email is configured.'}</p>
          </div>
        </section>
      </main>
    </div>
  )
}

