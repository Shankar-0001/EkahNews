import { createClient } from '@/lib/supabase/server'
import PublicHeader from '@/components/layout/PublicHeader'

export const metadata = {
  title: 'Terms of Service - EkahNews',
  description: 'Terms of service for EkahNews.',
}

export default async function TermsPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PublicHeader categories={categories || []} />
      <main className="w-full max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Terms of Service</h1>
        <div className="mt-6 space-y-4 text-gray-700 dark:text-gray-300">
          <p>By using EkahNews, you agree to follow applicable laws and platform usage rules.</p>
          <p>All published content remains the responsibility of its author and editorial team.</p>
          <p>Unauthorized copying, scraping, or misuse of content is prohibited.</p>
          <p>EkahNews may update these terms as the product evolves.</p>
        </div>
      </main>
    </div>
  )
}


