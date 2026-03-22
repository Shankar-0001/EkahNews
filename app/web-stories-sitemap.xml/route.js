import { createClient } from '@/lib/supabase/server'
import { absoluteUrl } from '@/lib/site-config'
import { urlsetXml, xmlResponse } from '@/lib/sitemap-utils'

export async function GET() {
  const supabase = await createClient()
  const { data: stories } = await supabase
    .from('web_stories')
    .select('slug, published_at, updated_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(5000)

  const entries = (stories || []).map((story) => ({
    loc: absoluteUrl(`/web-stories/${story.slug}`),
    lastmod: new Date(story.updated_at || story.published_at || Date.now()).toISOString(),
    changefreq: 'daily',
    priority: 0.6,
  }))

  return xmlResponse(urlsetXml(entries))
}
