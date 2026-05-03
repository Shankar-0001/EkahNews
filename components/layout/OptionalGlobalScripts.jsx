'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'

const PLACEHOLDER_CLIENT_IDS = new Set(['ca-pub-0000000000000000', 'ca-pub-1234567890123456'])

function isAmpStoryPath(pathname = '') {
  return pathname.startsWith('/web-stories/') && pathname !== '/web-stories'
}

export default function OptionalGlobalScripts() {
  const pathname = usePathname() || ''

  if (isAmpStoryPath(pathname)) {
    return null
  }

  const adsEnabled = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true'
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
  const hasValidAdsenseClientId = !!adsenseClientId && !PLACEHOLDER_CLIENT_IDS.has(adsenseClientId)
  const adsenseScriptSrc = hasValidAdsenseClientId
    ? `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`
    : null
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  const shouldLoadAnalytics = Boolean(gaMeasurementId)

  return (
    <>
      {shouldLoadAnalytics && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
            strategy="afterInteractive"
          />
          <Script id="google-gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaMeasurementId}');
            `}
          </Script>
        </>
      )}
      {adsEnabled && adsenseScriptSrc && (
        <Script
          src={adsenseScriptSrc}
          strategy="lazyOnload"
          crossOrigin="anonymous"
        />
      )}
    </>
  )
}
