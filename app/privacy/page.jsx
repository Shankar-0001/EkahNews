import { createClient } from '@/lib/supabase/server'
import PublicHeader from '@/components/layout/PublicHeader'

export const metadata = {
  title: 'Privacy Policy - EkahNews',
  description: 'Privacy policy for EkahNews.',
}

export default async function PrivacyPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PublicHeader categories={categories || []} />
      <main className="w-full max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Privacy Policy</h1>
        <div className="mt-6 space-y-4 text-gray-700 dark:text-gray-300">
          <p>We collect only the data required to provide and improve EkahNews services.</p>
          <p>Authentication and account data are managed securely through Supabase.</p>
          <p>Analytics and engagement signals (views, likes, shares) are used for content ranking and product improvements.</p>
          <p>You can contact the site administrator for data access, correction, or deletion requests.</p>
        </div>
      </main>
    </div>
  )
}


