import TermsPage, { generateMetadata as generateTermsMetadata } from '@/app/terms/page'
import { absoluteUrl } from '@/lib/site-config'

export async function generateMetadata() {
  const metadata = await generateTermsMetadata()

  return {
    ...metadata,
    robots: { index: true, follow: true },
    alternates: {
      canonical: absoluteUrl('/terms-of-service'),
    },
  }
}

export default TermsPage
