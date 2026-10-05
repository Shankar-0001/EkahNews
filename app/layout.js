import { SITE_URL, IS_NON_INDEXABLE_SITE } from '@/lib/site-config'
import dynamic from 'next/dynamic'
import './globals.css'
import SiteFooter from '@/components/layout/SiteFooter'
import RootProviders from '@/components/layout/RootProviders'
import OptionalGlobalScripts from '@/components/layout/OptionalGlobalScripts'
import SchemaScript from '@/components/seo/SchemaScript'
import { getOrganizationSchema, getWebSiteSchema } from '@/lib/schema'

const CookieConsent = dynamic(() => import('@/components/common/CookieConsent'), { ssr: false })

export const metadata = {
  metadataBase: new URL(SITE_URL),
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
    noarchive: IS_NON_INDEXABLE_SITE,
    index: !IS_NON_INDEXABLE_SITE,
    follow: !IS_NON_INDEXABLE_SITE,
    googleBot: {
      index: !IS_NON_INDEXABLE_SITE,
      follow: !IS_NON_INDEXABLE_SITE,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      en: SITE_URL,
      'x-default': SITE_URL,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
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
      <head>
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ? <link rel="preconnect" href="https://www.google-analytics.com" /> : null}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ? <link rel="dns-prefetch" href="https://www.google-analytics.com" /> : null}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bitter:wght@400;500;600;700&family=DM+Serif+Display&family=Open+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
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
