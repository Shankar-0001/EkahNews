const PLACEHOLDER_SLOTS = new Set(['1234567890', '0987654321', '1122334455', '5544332211'])
const PLACEHOLDER_CLIENT_IDS = new Set(['ca-pub-0000000000000000', 'ca-pub-1234567890123456'])

export function getAdSlotIds() {
  return {
    header: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HEADER || '',
    sidebar: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR || '',
    inArticle: process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE || '',
    mobileSticky: process.env.NEXT_PUBLIC_ADSENSE_SLOT_MOBILE_STICKY || '',
  }
}

export function isAdsEnabled() {
  return process.env.NEXT_PUBLIC_ADS_ENABLED === 'true'
}

export function hasValidAdsenseClientId() {
  const adClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || ''
  return !!adClientId && !PLACEHOLDER_CLIENT_IDS.has(adClientId)
}

export function hasRenderableAdSlot(slot) {
  return isAdsEnabled() && hasValidAdsenseClientId() && !!slot && !PLACEHOLDER_SLOTS.has(slot)
}
