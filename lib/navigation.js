export const MAIN_MENU = [
  { key: 'home', label: 'Home', href: '/' },
  { key: 'news', label: 'News', href: '/section/news/latest-news' },
  { key: 'crypto', label: 'Crypto', href: '/section/crypto/bitcoin' },
  { key: 'markets', label: 'Markets', href: '/section/markets/stock-market' },
  { key: 'ai', label: 'AI', href: '/section/ai/ai-news' },
  { key: 'technology', label: 'Technology', href: '/section/technology/mobile' },
  { key: 'business', label: 'Business', href: '/section/business/finance' },
  { key: 'web-stories', label: 'Web Stories', href: '/section/web-stories/crypto-stories' },
  { key: 'sponsored', label: 'Sponsored', href: '/section/sponsored/partner-stories' },
]

const category = (...categorySlugs) => ({ categorySlugs })

export const SUBMENU_CONFIG = {
  news: [{ title: 'News', items: [
    { label: 'Latest News', slug: 'latest-news', all: true },
    { label: 'Crypto News', slug: 'crypto-news', ...category('cryptocurrency') },
    { label: 'Market News', slug: 'market-news', ...category('markets', 'finance-markets') },
    { label: 'AI News', slug: 'ai-news', ...category('ai', 'artificial-intelligence') },
    { label: 'Tech News', slug: 'tech-news', ...category('technology') },
    { label: 'Business News', slug: 'business-news', ...category('business') },
    { label: 'Economic News', slug: 'economic-news', ...category('finance', 'finance-markets', 'markets') },
  ] }],
  crypto: [{ eyebrow: 'Crypto', title: 'Crypto', items: [
    { label: 'Bitcoin', slug: 'bitcoin', ...category('cryptocurrency') },
    { label: 'Ethereum', slug: 'ethereum', ...category('cryptocurrency') },
    { label: 'Market News', slug: 'market-news', ...category('cryptocurrency', 'markets') },
    { label: 'Altcoins', slug: 'altcoins', ...category('cryptocurrency') },
    { label: 'Meme Coins', slug: 'meme-coins', ...category('cryptocurrency') },
    { label: 'Stablecoins', slug: 'stablecoins', ...category('cryptocurrency') },
    { label: 'XRP', slug: 'xrp', ...category('cryptocurrency') },
    { label: 'DeFi', slug: 'defi', ...category('cryptocurrency') },
    { label: 'NFTs', slug: 'nfts', ...category('cryptocurrency') },
  ] }],
  markets: [{ eyebrow: 'Markets', title: 'Markets', items: [
    { label: 'Stock Market', slug: 'stock-market', ...category('markets', 'finance-markets') },
    { label: 'Crypto Markets', slug: 'crypto-markets', ...category('cryptocurrency', 'markets') },
    { label: 'Forex', slug: 'forex', ...category('markets', 'finance-markets') },
    { label: 'Commodities', slug: 'commodities', ...category('markets', 'finance-markets') },
    { label: 'ETFs', slug: 'etfs', ...category('markets', 'finance-markets') },
    { label: 'Bonds', slug: 'bonds', ...category('markets', 'finance-markets') },
    { label: 'Market Analysis', slug: 'market-analysis', ...category('markets', 'finance-markets') },
  ] }],
  business: [{ eyebrow: 'Business', title: 'Business', items: [
    { label: 'Finance', slug: 'finance', ...category('finance', 'finance-markets') },
    { label: 'IPO', slug: 'ipo', ...category('business', 'finance') },
    { label: 'Economy', slug: 'economy', ...category('business', 'finance', 'finance-markets') },
    { label: 'Companies', slug: 'companies', ...category('business') },
    { label: 'Startups', slug: 'startups', ...category('business', 'technology') },
    { label: 'Jobs', slug: 'jobs', ...category('business') },
    { label: 'Investments', slug: 'investments', ...category('business', 'finance', 'finance-markets') },
  ] }],
  technology: [{ eyebrow: 'Technology', title: 'Technology', items: [
    { label: 'Mobile', slug: 'mobile', ...category('technology') }, { label: 'Gadgets', slug: 'gadgets', ...category('technology') }, { label: 'Software', slug: 'software', ...category('technology') }, { label: 'Cybersecurity', slug: 'cybersecurity', ...category('technology') }, { label: 'Cloud Computing', slug: 'cloud-computing', ...category('technology') }, { label: 'Semiconductors', slug: 'semiconductors', ...category('technology') }, { label: 'Internet', slug: 'internet', ...category('technology') }, { label: 'Apps', slug: 'apps', ...category('technology') },
  ] }],
  ai: [{ eyebrow: 'AI', title: 'AI', items: [
    { label: 'AI News', slug: 'ai-news', ...category('ai', 'artificial-intelligence') }, { label: 'AI Tools', slug: 'ai-tools', ...category('ai', 'artificial-intelligence') }, { label: 'ChatGPT', slug: 'chatgpt', ...category('ai', 'artificial-intelligence') }, { label: 'AI Startups', slug: 'ai-startups', ...category('ai', 'artificial-intelligence', 'business') },
  ] }],
  'web-stories': [{ eyebrow: 'Web Stories', title: 'Web Stories', items: [
    { label: 'Crypto Stories', slug: 'crypto-stories', ...category('cryptocurrency') }, { label: 'AI Stories', slug: 'ai-stories', ...category('ai', 'artificial-intelligence') }, { label: 'Tech Stories', slug: 'tech-stories', ...category('technology') }, { label: 'Market Stories', slug: 'market-stories', ...category('markets', 'finance-markets') }, { label: 'Trending Stories', slug: 'trending-stories', all: true },
  ] }],
  sponsored: [{ eyebrow: 'Sponsored', title: 'Sponsored', items: [
    { label: 'Partner Stories', slug: 'partner-stories', all: true }, { label: 'Brand Features', slug: 'brand-features', all: true }, { label: 'Press Releases', slug: 'press-releases', all: true }, { label: 'Campaigns', slug: 'campaigns', all: true },
  ] }],
}

export function getSubmenuHref(menuKey, submenuSlug) {
  return `/section/${menuKey}/${submenuSlug}`
}

export function getSubmenuItem(menuKey, submenuSlug) {
  return (SUBMENU_CONFIG[menuKey] || []).flatMap((section) => section.items).find((item) => item.slug === submenuSlug) || null
}

export function getMenuKeyFromPath(pathname = '') {
  const match = pathname.match(/^\/section\/([^/]+)\//)
  return match?.[1] || null
}

export function getSubmenuSlugFromPath(pathname = '') {
  const match = pathname.match(/^\/section\/[^/]+\/([^/]+)/)
  return match?.[1] || null
}