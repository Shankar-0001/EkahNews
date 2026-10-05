import { cache } from 'react'
import { createOptionalPublicClient } from '@/lib/supabase/public-server'
import { buildNavigation } from '@/lib/navigation-model.mjs'

export const NAV_SELECT = 'id,key,parent_id,title,sort_order,is_enabled,destination_type,category_id,subcategory_id,topic_id,landing_id,custom_path,page_title,description,category:categories(slug),subcategory:subcategories(slug,is_active,categories(slug)),topic:topics(slug,is_active),landing:defined_landings(menu_key,slug,is_active)'

export const readNavigation = cache(async () => {
  const db = createOptionalPublicClient()
  if (!db) return { menus:[], available:false }
  const { data,error } = await db.from('navigation_items').select(NAV_SELECT).eq('is_enabled',true).order('sort_order').order('key').abortSignal(AbortSignal.timeout(10000))
  if (error) return { menus:[], available:false }
  return { menus:buildNavigation(data || []), available:true }
})
