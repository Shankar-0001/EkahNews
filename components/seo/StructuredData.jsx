export default function StructuredData({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export function NewsArticleSchema({
  title,
  description,
  image,
  datePublished,
  dateModified,
  authorName,
  url,
  category,
}) {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://EkahNews.com'

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description: description,
    image: image ? [image] : [],
    datePublished: datePublished,
    dateModified: dateModified || datePublished,
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: 'EkahNews',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    articleSection: category,
  }
}

export function BreadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function OrganizationSchema() {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://EkahNews.com'

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'EkahNews',
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    sameAs: [],
  }
}

export function WebSiteSchema() {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://EkahNews.com'

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'EkahNews',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

