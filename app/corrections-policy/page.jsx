import { createClient } from '@/lib/supabase/server'
import PublicHeader from '@/components/layout/PublicHeader'
import StructuredData from '@/components/seo/StructuredData'
import { absoluteUrl } from '@/lib/site-config'

export const metadata = {
  title: 'Corrections Policy - EkahNews',
  description: 'How EkahNews handles corrections, clarifications, and updates.',
}

export default async function CorrectionsPolicyPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')

  const pageUrl = absoluteUrl('/corrections-policy')
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Corrections Policy',
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Corrections Policy</h1>
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
      </main>
    </div>
  )
}

