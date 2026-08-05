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

  return (
    <>
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
