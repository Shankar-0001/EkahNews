import { createClient } from '@/lib/supabase/server'
import { absoluteUrl } from '@/lib/site-config'
import { urlsetXml, xmlResponse } from '@/lib/sitemap-utils'
import { filterBlockedCategories } from '@/lib/category-utils'

export async function GET() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('slug, updated_at')
    .order('name')

  const entries = filterBlockedCategories(categories || []).map((c) => ({
    loc: absoluteUrl(`/category/${c.slug}`),
    lastmod: new Date(c.updated_at || Date.now()).toISOString(),
    changefreq: 'daily',
    priority: 0.7,
  }))

  return xmlResponse(urlsetXml(entries))
}
