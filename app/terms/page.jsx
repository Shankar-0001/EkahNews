import { createClient } from '@/lib/supabase/server'
import SafeHtml from '@/components/SafeHtml'
import PublicHeader from '@/components/layout/PublicHeader'
import { getRenderableHtml, getStaticPageDefinition, getStaticPageOverride } from '@/lib/static-pages'

export async function generateMetadata() {
  const definition = getStaticPageDefinition('terms')
  const override = await getStaticPageOverride('terms')

  return {
    title: override?.seo_title || definition?.seoTitle || 'Terms of Service - EkahNews',
    description: override?.seo_description || definition?.seoDescription || 'Terms of service for EkahNews.',
  }
}

export default async function TermsPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')

  const override = await getStaticPageOverride('terms')
  const pageTitle = override?.title || 'Terms of Service'
  const contentHtml = override?.content_html ? getRenderableHtml(override.content_html) : null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
            <p>By using EkahNews, you agree to follow applicable laws and platform usage rules.</p>
            <p>All published content remains the responsibility of its author and editorial team.</p>
            <p>Unauthorized copying, scraping, or misuse of content is prohibited.</p>
            <p>EkahNews may update these terms as the product evolves.</p>
          </div>
        )}
      </main>
    </div>
  )
}
