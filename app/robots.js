import { SITE_URL, IS_NON_INDEXABLE_SITE, absoluteUrl } from '@/lib/site-config'

export default function robots() {
  if (IS_NON_INDEXABLE_SITE) return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api',
          '/api/',
          '/dashboard',
          '/admin/',
          '/admin',
          '/cms/',
          '/cms',
          '/dashboard/',
          '/login/',
          '/signup/',
          '/author-panel/',
          '/login',
          '/signup',
          '/category/eijfjka',
          '/category/kdfjskfj',
          '/category/skdfjoisk',
        ],
      },
      {
        userAgent: 'Googlebot-News',
        allow: '/',
      },
      {
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
      {
        userAgent: 'CCBot',
        disallow: ['/'],
      },
      {
        userAgent: 'anthropic-ai',
        disallow: ['/'],
      },
      {
        userAgent: 'Google-Extended',
        disallow: ['/'],
      },
    ],
    sitemap: [
      absoluteUrl('/sitemap.xml'),
      absoluteUrl('/sitemap-index.xml'),
      absoluteUrl('/news-sitemap.xml'),
    ],
    host: SITE_URL,
  }
}
