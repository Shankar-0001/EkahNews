export default function robots() {
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
          '/_next/',
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
      'https://www.ekahnews.com/sitemap.xml',
      'https://www.ekahnews.com/sitemap-index.xml',
      'https://www.ekahnews.com/news-sitemap.xml',
    ],
    host: 'https://www.ekahnews.com',
  }
}
