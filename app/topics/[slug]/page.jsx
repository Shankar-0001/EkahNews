import { readTopic } from '@/lib/editorial-collections'
import EditorialCollection from '@/components/content/EditorialCollection'
import { absoluteUrl } from '@/lib/site-config'
export const revalidate=60
export async function generateMetadata({params}) {
  const item=await readTopic(params.slug)
  return {title:(item?.title || 'Topic not found')+' | EkahNews',alternates:{canonical:absoluteUrl('/topics/'+params.slug)}}
}
export default async function Page({params,searchParams}) {
  return <EditorialCollection descriptor={await readTopic(params.slug)} path={'/topics/'+params.slug} searchParams={searchParams}/>
}
