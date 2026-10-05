import { readSubcategory } from '@/lib/editorial-collections'
import EditorialCollection from '@/components/content/EditorialCollection'
import { absoluteUrl } from '@/lib/site-config'
export const revalidate=60
export async function generateMetadata({params}) {
  const item=await readSubcategory(params.category,params.slug)
  return {title:(item?.title || 'Subcategory not found')+' | EkahNews',alternates:{canonical:absoluteUrl('/subcategory/'+params.category+'/'+params.slug)}}
}
export default async function Page({params,searchParams}) {
  return <EditorialCollection descriptor={await readSubcategory(params.category,params.slug)} path={'/subcategory/'+params.category+'/'+params.slug} searchParams={searchParams}/>
}
