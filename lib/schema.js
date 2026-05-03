export function getNewsArticleSchema(article) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.description || article.title,
    url: article.url,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': article.url,
    },
    image: {
      '@type': 'ImageObject',
      url: article.imageUrl || 'https://www.ekahnews.com/og-default.jpg',
      width: 1200,
      height: 630,
    },
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: {
      '@type': 'Person',
      name: article.authorName || 'EkahNews',
      url: article.authorUrl || 'https://www.ekahnews.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'EkahNews',
      url: 'https://www.ekahnews.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.ekahnews.com/logo.png',
        width: 200,
        height: 60,
      },
    },
    articleSection: article.categoryName || 'News',
    inLanguage: 'en-US',
    isAccessibleForFree: true,
  }
}

export function getBreadcrumbSchema(items) {
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

export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: 'EkahNews',
    url: 'https://www.ekahnews.com',
    logo: {
      '@type': 'ImageObject',
      url: 'https://www.ekahnews.com/logo.png',
      width: 200,
      height: 60,
    },
    sameAs: [],
    foundingDate: '2026',
    description: 'EkahNews delivers fast, credible coverage across technology, science, politics, and world news.',
    publishingPrinciples: 'https://www.ekahnews.com/editorial-policy',
    correctionsPolicy: 'https://www.ekahnews.com/corrections-policy',
    verificationFactCheckingPolicy: 'https://www.ekahnews.com/editorial-policy',
    masthead: 'https://www.ekahnews.com/about-us',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'editorial',
      url: 'https://www.ekahnews.com/contact',
    },
    inLanguage: 'en-US',
  }
}

export function getPersonSchema(author) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    url: `https://www.ekahnews.com/authors/${author.slug}`,
    description: author.bio,
    jobTitle: author.jobTitle || 'Journalist',
    sameAs: author.sameAs?.length ? author.sameAs : undefined,
    knowsAbout: author.knowsAbout?.length ? author.knowsAbout : undefined,
    hasCredential: author.credentials
      ? {
          '@type': 'EducationalOccupationalCredential',
          credentialCategory: 'Professional credentials',
          name: author.credentials,
        }
      : undefined,
    numberOfItems: author.numberOfItems || undefined,
    worksFor: {
      '@type': 'Organization',
      name: 'EkahNews',
      url: 'https://www.ekahnews.com',
    },
  }
}

export function getFAQSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }
}

export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'EkahNews',
    url: 'https://www.ekahnews.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://www.ekahnews.com/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function getSpeakableSchema(url) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': url,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', '.article-summary', 'h2', '[data-speakable]'],
    },
    url,
  }
}
