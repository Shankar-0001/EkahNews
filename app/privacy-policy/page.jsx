import PrivacyPage, { generateMetadata as generatePrivacyMetadata } from '@/app/privacy/page'
import { absoluteUrl, IS_NON_INDEXABLE_SITE } from '@/lib/site-config'

export async function generateMetadata() {
  const metadata = await generatePrivacyMetadata()

  return {
    ...metadata,
    robots: { index: !IS_NON_INDEXABLE_SITE, follow: !IS_NON_INDEXABLE_SITE, noarchive: IS_NON_INDEXABLE_SITE },
    alternates: {
      canonical: absoluteUrl('/privacy-policy'),
    },
  }
}

export default PrivacyPage
