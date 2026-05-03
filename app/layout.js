import dynamic from 'next/dynamic'
import './globals.css'
import SiteFooter from '@/components/layout/SiteFooter'
import RootProviders from '@/components/layout/RootProviders'
import OptionalGlobalScripts from '@/components/layout/OptionalGlobalScripts'
import SchemaScript from '@/components/seo/SchemaScript'
import { getOrganizationSchema, getWebSiteSchema } from '@/lib/schema'

const CookieConsent = dynamic(() => import('@/components/common/CookieConsent'), { ssr: false })

export const metadata = {
  metadataBase: new URL('https://www.ekahnews.com'),
  title: {
    default: 'EkahNews | Breaking Technology, Science & World News',
    template: '%s | EkahNews',
  },
  description: 'EkahNews delivers fast, credible coverage across technology, science, politics, and world news.',
  keywords: ['news', 'technology news', 'science news', 'world news', 'breaking news'],
  authors: [{ name: 'EkahNews Editorial Team' }],
  creator: 'EkahNews',
  publisher: 'EkahNews',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: 'https://www.ekahnews.com',
    languages: {
      en: 'https://www.ekahnews.com',
      'x-default': 'https://www.ekahnews.com',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.ekahnews.com',
    siteName: 'EkahNews',
    title: 'EkahNews | Breaking Technology, Science & World News',
    description: 'EkahNews delivers fast, credible coverage across technology, science, politics, and world news.',
    images: [
      {
        url: '/og-default.jpg',
        width: 1200,
        height: 630,
        alt: 'EkahNews - Breaking News and Insights',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@ekahnews',
    creator: '@ekahnews',
  },
  verification: {
    google: '',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <SchemaScript schema={[getOrganizationSchema(), getWebSiteSchema()]} />
        <OptionalGlobalScripts />
        <RootProviders>
          {children}
          <SiteFooter />
        </RootProviders>
        <CookieConsent />
      </body>
    </html>
  )
}
