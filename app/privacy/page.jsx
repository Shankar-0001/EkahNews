import { createClient } from '@/lib/supabase/server'
import SafeHtml from '@/components/SafeHtml'
import PublicHeader from '@/components/layout/PublicHeader'
import { getRenderableHtml, getStaticPageDefinition, getStaticPageOverride } from '@/lib/static-pages'
import { filterBlockedCategories } from '@/lib/category-utils'

export async function generateMetadata() {
  const definition = getStaticPageDefinition('privacy')
  const override = await getStaticPageOverride('privacy')

  return {
    title: override?.seo_title || definition?.seoTitle || 'Privacy Policy - EkahNews',
    description: override?.seo_description || definition?.seoDescription || 'Privacy policy for EkahNews.',
    robots: { index: false, follow: false },
    alternates: { canonical: 'https://www.ekahnews.com/privacy-policy' },
  }
}

export default async function PrivacyPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')
  const filteredCategories = filterBlockedCategories(categories || [])

  const override = await getStaticPageOverride('privacy')
  const pageTitle = override?.title || 'Privacy Policy'
  const contentHtml = override?.content_html ? getRenderableHtml(override.content_html) : null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
            <p>We collect only the data required to provide and improve EkahNews services.</p>
            <p>Authentication and account data are managed securely through Supabase.</p>
            <p>Analytics and engagement signals (views, likes, shares) are used for content ranking and product improvements.</p>
            <p>You can contact the site administrator for data access, correction, or deletion requests.</p>
          </div>
        )}
      </main>
    </div>
  )
}
