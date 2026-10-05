import EditorialCollection from '@/components/content/EditorialCollection'
import { absoluteUrl } from '@/lib/site-config'
export const revalidate=60
export const metadata={title:'Sponsored | EkahNews',alternates:{canonical:absoluteUrl('/sponsored')}}
export default function Page({searchParams}) {
  return <EditorialCollection descriptor={{title:'Sponsored',description:'Partner stories and commercial features with clear disclosures.',content_kind:'sponsored'}} path="/sponsored" searchParams={searchParams}/>
}
