import { createClient } from '@/lib/supabase/server'
import SafeHtml from '@/components/SafeHtml'
import PublicHeader from '@/components/layout/PublicHeader'
import StructuredData from '@/components/seo/StructuredData'
import { absoluteUrl, getPublicationContactInfo, getPublicationSocialProfiles } from '@/lib/site-config'
import { getRenderableHtml, getStaticPageDefinition, getStaticPageOverride } from '@/lib/static-pages'

export async function generateMetadata() {
  const definition = getStaticPageDefinition('about-us')
  const override = await getStaticPageOverride('about-us')

  return {
    title: override?.seo_title || definition?.seoTitle || 'About Us - EkahNews',
    description: override?.seo_description
      || definition?.seoDescription
      || 'Learn about EkahNews, our newsroom values, and our commitment to responsible journalism.',
  }
}

export default async function AboutUsPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')

  const override = await getStaticPageOverride('about-us')
  const pageTitle = override?.title || 'About EkahNews'
  const contentHtml = override?.content_html ? getRenderableHtml(override.content_html) : null
  const pageUrl = absoluteUrl('/about-us')
  const contact = getPublicationContactInfo()
  const socialProfiles = getPublicationSocialProfiles()
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: pageTitle,
    url: pageUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: 'EkahNews',
      url: absoluteUrl('/'),
    },
    about: {
      '@type': 'Organization',
      name: 'EkahNews',
      url: absoluteUrl('/'),
      sameAs: socialProfiles,
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
              EkahNews delivers timely, reliable coverage across major categories with a focus on clarity, context, and
              public value. Our newsroom prioritizes accuracy, transparency, and reader trust.
            </p>
            <p>
              We combine human editorial judgment with data-informed workflows to surface stories that matter while
              maintaining strong editorial standards.
            </p>
            <p>
              If you have questions about our coverage or want to suggest a story, please reach out via our contact page.
            </p>
          </div>
        )}
        <section className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Editorial Standards</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              We prioritize verification, clear sourcing, and meaningful updates when facts change.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Reader Contact</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {contact.editorialEmail || contact.email || 'Use the contact page to reach our newsroom and support team.'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Public Presence</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {socialProfiles.length > 0 ? `${socialProfiles.length} official social profile${socialProfiles.length > 1 ? 's are' : ' is'} configured.` : 'Official social profiles can be added through environment configuration.'}
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}

