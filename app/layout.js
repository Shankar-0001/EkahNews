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
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        {process.env.NEXT_PUBLIC_GTM_ID ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${process.env.NEXT_PUBLIC_GTM_ID}');`,
            }}
          />
        ) : null}
      </head>
      <body className="font-sans">
        {process.env.NEXT_PUBLIC_GTM_ID ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GTM_ID}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        ) : null}
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
