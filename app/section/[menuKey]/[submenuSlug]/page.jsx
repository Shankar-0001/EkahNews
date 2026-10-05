import { readLanding, collectionPage } from '@/lib/editorial-collections'
import EditorialCollection from '@/components/content/EditorialCollection'
import { absoluteUrl, IS_LOCAL_SITE } from '@/lib/site-config'

export const revalidate = 60
export async function generateMetadata({params,searchParams}) {
  const item = await readLanding(params.menuKey,params.submenuSlug)
  if (!item) return {title:'Section not found',robots:{index:false}}
  const page = collectionPage(searchParams?.page)
  const path = '/section/'+params.menuKey+'/'+params.submenuSlug + (page > 1 ? '?page='+page : '')
  return {title:item.title+' | EkahNews',description:item.description || 'Editorial coverage from EkahNews.',alternates:{canonical:absoluteUrl(path)},robots:{index:!IS_LOCAL_SITE && item.selection_mode!=='curated',follow:!IS_LOCAL_SITE}}
}
export default async function Page({params,searchParams}) {
  const descriptor = await readLanding(params.menuKey,params.submenuSlug)
  return <EditorialCollection descriptor={descriptor} path={'/section/'+params.menuKey+'/'+params.submenuSlug} searchParams={searchParams}/>
}
