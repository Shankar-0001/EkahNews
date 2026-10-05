import { cache } from 'react'
import { createOptionalPublicClient } from '@/lib/supabase/public-server'

export const readLanding = cache(async (menu,slug) => {
  const db = createOptionalPublicClient()
  if (!db) throw new Error('Editorial data unavailable')
  const {data,error} = await db.from('defined_landings').select('*,landing_categories(category_id),navigation_items(page_title,description,is_enabled,sort_order)').eq('menu_key',menu).eq('slug',slug).eq('is_active',true).maybeSingle()
  if (error) throw new Error('Editorial destination lookup failed')
  if (!data) return null
  const menuText = data.navigation_items?.filter(n=>n.is_enabled).sort((a,b)=>a.sort_order-b.sort_order)[0]
  return {...data,title:menuText?.page_title || data.title,description:menuText?.description || data.description}
})

export async function readCollection(descriptor,page = 1) {
  const db = createOptionalPublicClient()
  if (!db) throw new Error('Editorial data unavailable')
  const stories = descriptor.content_kind === 'web_stories'
  let fields = stories
    ? 'id,title,slug,cover_image,cover_image_alt,published_at'
    : 'id,title,slug,excerpt,featured_image_url,published_at,categories:categories!articles_category_id_fkey(name,slug),authors(name)'
  if (descriptor.content_kind === 'sponsored') fields += ',article_sponsorships!inner(kind,sponsor_name,disclosure)'
  if (descriptor.topic_id) fields += ',article_topics!inner(topic_id)'
  if (descriptor.selection_mode === 'curated') fields += stories ? ',landing_web_stories!inner(landing_id)' : ',landing_articles!inner(landing_id)'
  if (descriptor.selection_mode === 'categories' && !stories) fields += ',article_categories!inner(category_id)'
  let query = db.from(stories ? 'web_stories' : 'articles').select(fields,{count:'exact'}).eq('status','published')
  if (descriptor.content_kind === 'sponsored' && descriptor.sponsorship_kind) query = query.eq('article_sponsorships.kind',descriptor.sponsorship_kind)
  if (descriptor.subcategory_id) query = query.eq('subcategory_id',descriptor.subcategory_id)
  if (descriptor.topic_id) query = query.eq('article_topics.topic_id',descriptor.topic_id)
  if (descriptor.selection_mode === 'curated') query = query.eq(stories ? 'landing_web_stories.landing_id' : 'landing_articles.landing_id',descriptor.id)
  if (descriptor.selection_mode === 'categories') {
    const ids = descriptor.landing_categories?.map(row=>row.category_id) || []
    if (!ids.length) return {items:[],count:0,stories}
    query = query.in(stories ? 'category_id' : 'article_categories.category_id',ids)
  }
  const {data,error,count} = await query.order('published_at',{ascending:false}).order('id').range((page-1)*18,page*18-1)
  if (error) throw new Error('Editorial content query failed')
  return {items:data || [],count:count || 0,stories}
}
export function collectionPage(value) {
  if (value === undefined) return 1
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,4}$/.test(value)) return null
  return Number(value)
}
export const readTopic = cache(async slug => {
  const db = createOptionalPublicClient()
  if (!db) throw new Error('Editorial data unavailable')
  const {data,error} = await db.from('topics').select('id,name,description').eq('slug',slug).eq('is_active',true).maybeSingle()
  if (error) throw new Error('Topic lookup failed')
  return data ? {...data,title:data.name,topic_id:data.id,content_kind:'articles'} : null
})
export const readSubcategory = cache(async (parent,slug) => {
  const db = createOptionalPublicClient()
  if (!db) throw new Error('Editorial data unavailable')
  const {data,error} = await db.from('subcategories').select('id,name,page_title,page_description,categories!inner(slug)').eq('slug',slug).eq('categories.slug',parent).eq('is_active',true).maybeSingle()
  if (error) throw new Error('Subcategory lookup failed')
  return data ? {...data,title:data.page_title || data.name,description:data.page_description,subcategory_id:data.id,content_kind:'articles'} : null
})
