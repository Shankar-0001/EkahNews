'use client'

import Script from 'next/script'
const PLACEHOLDER_CLIENT_IDS = new Set(['ca-pub-0000000000000000', 'ca-pub-1234567890123456'])

export default function OptionalGlobalScripts() {
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
