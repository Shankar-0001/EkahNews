/**
 * SEO & Metadata Utilities
 * Generates optimized metadata for articles and pages
 */
import { buildArticleKeywords, keywordsToMetadataValue } from '@/lib/keywords'

/**
 * Generate article metadata
 */
export const generateArticleMetadata = (article) => {
    const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://EkahNews.com'
    const canonicalPath = article.categories?.slug
        ? `/${article.categories.slug}/${article.slug}`
        : `/articles/${article.slug}`
    const canonicalUrl = `${siteUrl}${canonicalPath}`

    const keywords = buildArticleKeywords(article)

    return {
        title: article.seo_title || article.title || 'Article',
        description: article.seo_description || article.excerpt || '',
        keywords: keywordsToMetadataValue(keywords),
        authors: article.authors?.name ? [{ name: article.authors.name }] : [],
        publishedTime: article.published_at,
        modifiedTime: article.updated_at,
        images: article.featured_image_url ? [{ url: article.featured_image_url }] : [],
        openGraph: {
            type: 'article',
            title: article.seo_title || article.title,
            description: article.seo_description || article.excerpt,
            url: canonicalUrl,
            images: article.featured_image_url
                ? [{ url: article.featured_image_url, width: 1200, height: 630 }]
                : [],
            article: {
                authors: article.authors ? [article.authors.name] : [],
                publishedTime: article.published_at,
                modifiedTime: article.updated_at,
                tags: keywords,
            },
        },
        twitter: {
            card: 'summary_large_image',
            title: article.seo_title || article.title,
            description: article.seo_description || article.excerpt,
            image: article.featured_image_url || '',
        },
        alternates: {
            canonical: canonicalUrl,
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-image-preview': 'large',
                'max-snippet': -1,
                'max-video-preview': -1,
            },
        },
    }
}

/**
 * Generate category page metadata
 */
export const generateCategoryMetadata = (category) => {
    const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://EkahNews.com'
    const canonicalUrl = `${siteUrl}/category/${category.slug}`
    const description = category.description
        || `Latest ${category.name} news, updates, and analysis on EkahNews.`

    return {
        title: `${category.name} News and Updates | EkahNews`,
        description,
        keywords: `${category.name}, news, articles`,
        alternates: {
            canonical: canonicalUrl,
        },
        openGraph: {
            type: 'website',
            title: `${category.name} News and Updates | EkahNews`,
            description,
            url: canonicalUrl,
            images: [{ url: `${siteUrl}/logo.png` }],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${category.name} News and Updates | EkahNews`,
            description,
            images: [`${siteUrl}/logo.png`],
        },
    }
}

/**
 * Generate author page metadata
 */
export const generateAuthorMetadata = (author) => {
    return {
        title: `${author.name} - EkahNews`,
        description: author.bio || `Read articles by ${author.name}`,
        keywords: `${author.name}, author, articles`,
        openGraph: {
            type: 'profile',
            title: `${author.name} - EkahNews`,
            description: author.bio,
            url: `/authors/${author.slug}`,
            images: author.avatar_url ? [{ url: author.avatar_url }] : [],
        },
    }
}

/**
 * Structured Data (Schema.org) for Article
 */
export const generateArticleSchema = (article, siteUrl = 'https://EkahNews.com') => {
    return {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.title,
        description: article.excerpt,
        image: article.featured_image_url,
        datePublished: article.published_at,
        dateModified: article.updated_at || article.published_at,
        author: {
            '@type': 'Person',
            name: article.authors?.name || 'EkahNews',
            url: article.authors?.slug ? `${siteUrl}/authors/${article.authors.slug}` : undefined,
        },
        publisher: {
            '@type': 'Organization',
            name: 'EkahNews',
            logo: {
                '@type': 'ImageObject',
                url: `${siteUrl}/logo.png`,
                width: 250,
                height: 60,
            },
        },
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': article.categories?.slug
                ? `${siteUrl}/${article.categories.slug}/${article.slug}`
                : `${siteUrl}/articles/${article.slug}`,
        },
        articleSection: article.categories?.name || 'News',
        keywords: keywordsToMetadataValue(buildArticleKeywords(article)),
    }
}

/**
 * Composite schema blocks for AEO/GEO/Discover.
 */
export const generateArticleSchemas = ({
    article,
    articleUrl,
    breadcrumbs = [],
    faqItems = [],
    readingTimeMinutes = 1,
}) => {
    const baseImage = article.featured_image_url ? [article.featured_image_url] : []
    const publisher = {
        '@type': 'Organization',
        name: 'EkahNews',
        logo: {
            '@type': 'ImageObject',
            url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://EkahNews.com'}/logo.png`,
            width: 250,
            height: 60,
        },
    }

    const newsArticle = {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: article.title,
        description: article.excerpt,
        image: baseImage,
        datePublished: article.published_at,
        dateModified: article.updated_at || article.published_at,
        author: {
            '@type': 'Person',
            name: article.authors?.name || 'EkahNews',
            url: article.authors?.slug ? `${process.env.NEXT_PUBLIC_BASE_URL || 'https://EkahNews.com'}/authors/${article.authors.slug}` : undefined,
        },
        publisher,
        mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': articleUrl,
        },
        articleSection: article.categories?.name || 'News',
        keywords: keywordsToMetadataValue(buildArticleKeywords(article)),
        timeRequired: `PT${Math.max(1, readingTimeMinutes)}M`,
    }

    const blogPosting = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: article.title,
        description: article.excerpt,
        image: baseImage,
        datePublished: article.published_at,
        dateModified: article.updated_at || article.published_at,
        author: newsArticle.author,
        publisher,
        mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    }

    const breadcrumbList = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    }

    const faqPage = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqItems.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.answer,
            },
        })),
    }

    return {
        newsArticle,
        blogPosting,
        breadcrumbList,
        faqPage,
    }
}

/**
 * Structured Data for Organization
 */
export const generateOrganizationSchema = (config = {}) => {
    const {
        name = 'EkahNews',
        url = 'https://EkahNews.com',
        logo = 'https://EkahNews.com/logo.png',
        description = 'Latest news and insights',
        socialProfiles = [],
    } = config

    return {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name,
        url,
        logo,
        description,
        sameAs: socialProfiles,
    }
}

/**
 * Structured Data for Breadcrumb
 */
export const generateBreadcrumbSchema = (items) => {
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

/**
 * Generate robots.txt content
 */
export const generateRobotsTxt = (siteUrl = 'https://EkahNews.com') => {
    return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /api
Disallow: /login
Disallow: /signup

Sitemap: ${siteUrl}/sitemap.xml
`
}

/**
 * Generate sitemap XML
 */
export const generateSitemap = (articles = [], pages = [], siteUrl = 'https://EkahNews.com') => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages
            .map(
                page => `
  <url>
    <loc>${siteUrl}${page.path}</loc>
    <lastmod>${new Date(page.modifiedTime).toISOString()}</lastmod>
    <changefreq>${page.changefreq || 'weekly'}</changefreq>
    <priority>${page.priority || 0.8}</priority>
  </url>
  `
            )
            .join('')}
  ${articles
            .filter(a => a.status === 'published')
            .map(
                article => `
  <url>
    <loc>${siteUrl}/articles/${article.slug}</loc>
    <lastmod>${new Date(article.published_at).toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  `
            )
            .join('')}
</urlset>`
    return xml
}

/**
 * Meta tags configuration object
 */
export const createMetaTags = (config) => {
    const {
        title = 'EkahNews',
        description = 'Latest news and insights',
        image = 'https://EkahNews.com/og-image.png',
        url = 'https://EkahNews.com',
        type = 'website',
        twitterHandle = '@EkahNews',
    } = config

    return {
        metadataBase: new URL(url),
        title,
        description,
        openGraph: {
            title,
            description,
            images: [{ url: image }],
            type,
            url,
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            image,
            creator: twitterHandle,
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-video-preview': -1,
                'max-image-preview': 'large',
                'max-snippet': -1,
            },
        },
        alternates: {
            canonical: url,
        },
    }
}

export default {
    generateArticleMetadata,
    generateCategoryMetadata,
    generateAuthorMetadata,
    generateArticleSchema,
    generateArticleSchemas,
    generateOrganizationSchema,
    generateBreadcrumbSchema,
    generateRobotsTxt,
    generateSitemap,
    createMetaTags,
}

