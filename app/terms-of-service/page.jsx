import TermsPage, { generateMetadata as generateTermsMetadata } from '@/app/terms/page'
import { absoluteUrl, IS_NON_INDEXABLE_SITE } from '@/lib/site-config'

export async function generateMetadata() {
  const metadata = await generateTermsMetadata()

  return {
    ...metadata,
    robots: { index: !IS_NON_INDEXABLE_SITE, follow: !IS_NON_INDEXABLE_SITE, noarchive: IS_NON_INDEXABLE_SITE },
    alternates: {
      canonical: absoluteUrl('/terms-of-service'),
    },
  }
}

export default TermsPage
