import { createClient } from '@/lib/supabase/server'
import SafeHtml from '@/components/SafeHtml'
import PublicHeader from '@/components/layout/PublicHeader'
import StructuredData from '@/components/seo/StructuredData'
import { absoluteUrl, getPublicationContactInfo } from '@/lib/site-config'
import { getRenderableHtml, getStaticPageDefinition, getStaticPageOverride } from '@/lib/static-pages'

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
        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Verification</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Reporting should be grounded in primary sources, corroboration, and clear sourcing whenever possible.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Updates</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Major factual changes should be reflected promptly with updated timestamps and clear editorial judgment.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Contact</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {contact.editorialEmail || contact.email || 'Readers can use the contact page to raise editorial concerns or feedback.'}
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}

