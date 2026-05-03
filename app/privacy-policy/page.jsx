import PrivacyPage, { generateMetadata as generatePrivacyMetadata } from '@/app/privacy/page'
import { absoluteUrl } from '@/lib/site-config'

export async function generateMetadata() {
  const metadata = await generatePrivacyMetadata()

  return {
    ...metadata,
    robots: { index: true, follow: true },
    alternates: {
      canonical: absoluteUrl('/privacy-policy'),
    },
  }
}

export default PrivacyPage
