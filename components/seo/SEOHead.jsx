'use client'

import Head from 'next/head'

export default function SEOHead({
  title,
  description,
  canonical,
  ogType = 'website',
  ogImage,
  article,
  author,
  publishedTime,
  modifiedTime,
  tags = [],
}) {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://EkahNews.com'
  const siteName = 'EkahNews'
  const fullTitle = title ? `${title} | ${siteName}` : siteName
  const canonicalUrl = canonical ? `${siteUrl}${canonical}` : siteUrl

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Google Discover Optimization */}
      <meta name="robots" content="max-image-preview:large, index, follow" />

      {/* OpenGraph Tags */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title || siteName} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={siteName} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {ogImage && <meta property="og:image:width" content="1200" />}
      {ogImage && <meta property="og:image:height" content="630" />}

      {/* Article Specific OG Tags */}
      {article && (
        <>
          <meta property="article:published_time" content={publishedTime} />
          {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
          {author && <meta property="article:author" content={author} />}
          {tags.map(tag => (
            <meta key={tag} property="article:tag" content={tag} />
          ))}
        </>
      )}

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title || siteName} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {/* Additional Meta */}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
    </Head>
  )
}

