import { SITE_URL, getPublicationContactInfo, getPublicationLogoUrl, getPublicationSocialProfiles } from '@/lib/site-config'
import { buildArticleImageUrls } from '@/lib/seo-utils'

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
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description,
    image: Array.isArray(image) ? image : (image ? buildArticleImageUrls({ featured_image_url: image, featured_image_alt: title, title }) : []),
    datePublished,
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
        url: getPublicationLogoUrl(),
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
  const contact = getPublicationContactInfo()
  const contactPoints = [
    contact.email
      ? {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: contact.email,
      }
      : null,
    contact.editorialEmail
      ? {
        '@type': 'ContactPoint',
        contactType: 'newsroom',
        email: contact.editorialEmail,
      }
      : null,
  ].filter(Boolean)

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'EkahNews',
    url: SITE_URL,
    logo: getPublicationLogoUrl(),
    sameAs: getPublicationSocialProfiles(),
    ...(contactPoints.length > 0 ? { contactPoint: contactPoints } : {}),
  }
}

export function WebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'EkahNews',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}
