import { createClient } from '@/lib/supabase/server'
import PublicHeader from '@/components/layout/PublicHeader'
import StructuredData from '@/components/seo/StructuredData'
import { absoluteUrl } from '@/lib/site-config'

export const metadata = {
  title: 'Contact - EkahNews',
  description: 'Contact the EkahNews editorial and support teams.',
}

export default async function ContactPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')

  const pageUrl = absoluteUrl('/contact')
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: 'Contact EkahNews',
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contact</h1>
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
      </main>
    </div>
  )
}

