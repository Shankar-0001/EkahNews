'use client'

import { useEffect } from 'react'

const PLACEHOLDER_SLOTS = new Set(['1234567890', '0987654321', '1122334455', '5544332211'])
const PLACEHOLDER_CLIENT_IDS = new Set(['ca-pub-0000000000000000', 'ca-pub-1234567890123456'])

const SLOT_IDS = {
  header: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HEADER || '',
  sidebar: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR || '',
  inArticle: process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE || '',
  mobileSticky: process.env.NEXT_PUBLIC_ADSENSE_SLOT_MOBILE_STICKY || '',
}

export default function AdComponent({ slot, format = 'auto', responsive = true, className = '' }) {
  const adsEnabled = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true'
  const adClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
  const hasValidSlot = !!slot && !PLACEHOLDER_SLOTS.has(slot)
  const hasValidClientId = !!adClientId && !PLACEHOLDER_CLIENT_IDS.has(adClientId)

  if (!adsEnabled || !hasValidClientId || !hasValidSlot) {
    if (process.env.NODE_ENV === 'development' && adsEnabled && (!hasValidClientId || !hasValidSlot)) {
      console.warn('AdSense disabled: configure real client and slot IDs before enabling ads.')
    }
    return null
  }

  useEffect(() => {
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (err) {
      console.error('AdSense error:', err)
    }
  }, [])

  const minHeight = format === 'rectangle'
    ? 250
    : format === 'horizontal'
      ? 90
      : format === 'fluid'
        ? 120
        : 90

  return (
    <div className={`ad-container ${className}`} style={{ minHeight }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', minHeight }}
        data-ad-client={adClientId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
    </div>
  )
}

export function HeaderAd() {
  return <AdComponent slot={SLOT_IDS.header} format="horizontal" className="mb-4" />
}

export function SidebarAd() {
  return <AdComponent slot={SLOT_IDS.sidebar} format="rectangle" className="mb-4" />
}

export function InArticleAd() {
  return <AdComponent slot={SLOT_IDS.inArticle} format="fluid" className="my-6" />
}

export function MobileStickyAd() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white dark:bg-gray-900 border-t shadow-lg">
      <AdComponent slot={SLOT_IDS.mobileSticky} format="horizontal" responsive={true} />
    </div>
  )
}
