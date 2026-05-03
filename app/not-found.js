import Link from 'next/link'
import PublicHeader from '@/components/layout/PublicHeader'
import { createClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'Page Not Found | EkahNews',
  description: 'The page you are looking for does not exist.',
  robots: { index: false, follow: false },
}

export default async function NotFound() {
  let categories = []

  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('categories')
      .select('id, name, slug')
      .order('name')

    categories = data || []
  } catch {
    categories = []
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PublicHeader categories={categories} />
      <div className="flex items-center justify-center p-4 py-16">
        <div className="w-full max-w-xl rounded-[24px] border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">404 - Page Not Found</h1>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
            The page you are looking for does not exist or has been moved.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:border-[#b4235a] hover:text-[#b4235a] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-[#d94b7d] dark:hover:text-[#d94b7d]"
          >
            Return to homepage
          </Link>
        </div>
      </div>
    </div>
  )
}
