'use client'

import { useEffect } from 'react'
import { getAdSlotIds, hasRenderableAdSlot } from '@/lib/ads'

export default function AdComponent({ slot, format = 'auto', responsive = true, className = '' }) {
  const adClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
  const canRenderAd = hasRenderableAdSlot(slot)

  if (!canRenderAd) {
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ADS_ENABLED === 'true') {
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
  const slotIds = getAdSlotIds()
  return <AdComponent slot={slotIds.header} format="horizontal" className="mb-4" />
}

export function SidebarAd() {
  const slotIds = getAdSlotIds()
  return <AdComponent slot={slotIds.sidebar} format="rectangle" className="mb-4" />
}

export function InArticleAd() {
  const slotIds = getAdSlotIds()
  return <AdComponent slot={slotIds.inArticle} format="fluid" className="my-6" />
}

export function MobileStickyAd() {
  const slotIds = getAdSlotIds()
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white dark:bg-gray-900 border-t shadow-lg">
      <AdComponent slot={slotIds.mobileSticky} format="horizontal" responsive={true} />
    </div>
  )
}
