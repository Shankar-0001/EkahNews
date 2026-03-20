import './globals.css'
import { ThemeProvider } from 'next-themes'
import SiteFooter from '@/components/layout/SiteFooter'
import Script from 'next/script'

const PLACEHOLDER_CLIENT_IDS = new Set(['ca-pub-0000000000000000', 'ca-pub-1234567890123456'])

export const metadata = {
  title: 'EkahNews - Latest News and Insights',
  description: 'Your trusted source for breaking news, trending stories, and expert insights.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://ekahnews.com'),
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
}

export default function RootLayout({ children }) {
  const adsEnabled = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true'
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
  const hasValidAdsenseClientId = !!adsenseClientId && !PLACEHOLDER_CLIENT_IDS.has(adsenseClientId)
  const adsenseScriptSrc = hasValidAdsenseClientId
    ? `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`
    : null
  const gaMeasurementId = 'G-8HXXQFFZCH'

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="robots" content="max-image-preview:large" />
      </head>
      <body className="font-sans">
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaMeasurementId}');
          `}
        </Script>
        {/* Lazy-load third-party ad script to protect initial paint/Core Web Vitals */}
        {adsEnabled && adsenseScriptSrc && (
          <Script
            src={adsenseScriptSrc}
            strategy="lazyOnload"
            crossOrigin="anonymous"
          />
        )}
        <ThemeProvider attribute="class" storageKey="public-theme" defaultTheme="system" enableSystem>
          {children}
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  )
}