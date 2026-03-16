export default function robots() {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://ekahnews.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/api/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/dashboard/', '/api/'],
      },
    ],
    sitemap: [
      `${siteUrl}/sitemap.xml`,
      `${siteUrl}/article-sitemap.xml`,
      `${siteUrl}/news-sitemap.xml`,
      `${siteUrl}/category-sitemap.xml`,
      `${siteUrl}/topic-sitemap.xml`,
      `${siteUrl}/web-stories-sitemap.xml`,
    ],
  }
}


