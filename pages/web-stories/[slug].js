import Head from 'next/head'
import { createClient } from '@supabase/supabase-js'
import { absoluteUrl, getPublicationLogoUrl, resolveCanonicalUrl } from '@/lib/site-config'
import { keywordsToMetadataValue, normalizeManualKeywords } from '@/lib/keywords'
import { parseStructuredDataOverride } from '@/lib/seo-utils'

export const config = { amp: true }

const AMP_CUSTOM_CSS = `
  amp-story {
    font-family: Arial, sans-serif;
    color: #fff;
    background: #020617;
  }
  .scrim {
    background: linear-gradient(180deg, rgba(2, 6, 23, 0.08) 0%, rgba(2, 6, 23, 0.24) 32%, rgba(2, 6, 23, 0.88) 100%);
  }
  .slide-shell {
    align-content: end;
    padding: 0 26px 34px;
  }
  .headline {
    font-size: 34px;
    line-height: 1.05;
    font-weight: 800;
    margin: 0 0 14px;
  }
  .meta {
    font-size: 12px;
    line-height: 1.5;
    opacity: 0.82;
  }
  .body {
    font-size: 18px;
    line-height: 1.6;
    margin: 0;
  }
  .cta-shell {
    align-content: center;
    text-align: center;
    padding: 0 28px;
  }
  .cta-hint {
    display: inline-block;
    background: rgba(37, 99, 235, 0.92);
    color: #fff;
    padding: 14px 22px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .cta-hint.whatsapp {
    background: rgba(22, 163, 74, 0.92);
  }
`

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase public environment variables for web stories')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function getProductionHostname() {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (!siteUrl) return ''

  try {
    return new URL(siteUrl).hostname
  } catch {
    return ''
  }
}

function getSlides(story) {
  return Array.isArray(story?.slides) ? story.slides.filter((slide) => slide?.image || slide?.video) : []
}

function getDescription(story, slides) {
  return story?.seo_description || slides[0]?.description || story?.title || 'Web Story'
}

function getCanonical(story) {
  return resolveCanonicalUrl(story?.canonical_url, `/web-stories/${story?.slug || ''}`)
}

function buildSchemas(story, slides, canonical) {
  const description = getDescription(story, slides)
  const logoUrl = getPublicationLogoUrl()
  const keywords = keywordsToMetadataValue(normalizeManualKeywords(story?.keywords || []))
  const breadcrumbItems = [
    { name: 'Home', url: absoluteUrl('/') },
    { name: 'Web Stories', url: absoluteUrl('/web-stories') },
    { name: story.title, url: canonical },
  ]

  const defaultSchema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: story.seo_title || story.title,
    description,
    image: story.cover_image ? [story.cover_image] : slides.slice(0, 4).map((slide) => slide.image).filter(Boolean),
    datePublished: story.published_at || story.updated_at,
    dateModified: story.updated_at || story.published_at,
    author: {
      '@type': 'Person',
      name: story.authors?.name || 'EkahNews',
    },
    publisher: {
      '@type': 'Organization',
      name: 'EkahNews',
      logo: {
        '@type': 'ImageObject',
        url: logoUrl,
      },
    },
    mainEntityOfPage: canonical,
    keywords,
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }

  return {
    primary: parseStructuredDataOverride(story.structured_data) || defaultSchema,
    breadcrumb: breadcrumbSchema,
  }
}

function buildAmpAnalyticsConfig(measurementId) {
  return {
    vars: {
      gtag_id: measurementId,
      config: {
        [measurementId]: {
          groups: 'default',
        },
      },
    },
  }
}

function buildAmpStoryAdsConfig() {
  const network = (process.env.NEXT_PUBLIC_WEB_STORY_AD_NETWORK || '').trim().toLowerCase()

  if (network === 'adsense') {
    const adClient = (process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || '').trim()
    const adSlot = (process.env.NEXT_PUBLIC_WEB_STORY_ADSENSE_SLOT || '').trim()

    if (!adClient || !adSlot) {
      return null
    }

    return {
      'ad-attributes': {
        type: 'adsense',
        'data-ad-client': adClient,
        'data-ad-slot': adSlot,
      },
    }
  }

  if (network === 'doubleclick') {
    const adSlot = (process.env.NEXT_PUBLIC_WEB_STORY_DOUBLECLICK_SLOT || '').trim()

    if (!adSlot) {
      return null
    }

    return {
      'ad-attributes': {
        type: 'doubleclick',
        'data-slot': adSlot,
      },
    }
  }

  return null
}

export async function getServerSideProps({ params, req, res }) {
  try {
    const supabase = getSupabase()
    const { data: story } = await supabase
      .from('web_stories')
      .select('id, title, slug, seo_title, seo_description, canonical_url, structured_data, cover_image, cover_image_alt, slides, keywords, related_article_slug, cta_text, cta_url, whatsapp_group_url, published_at, updated_at, authors(name, slug), categories(name, slug), status')
      .eq('slug', params.slug)
      .eq('status', 'published')
      .maybeSingle()

    const slides = getSlides(story)
    if (!story || slides.length < 4) {
      return { notFound: true }
    }

    const productionHostname = getProductionHostname()
    const requestHostname = (req?.headers?.host || '').split(':')[0]
    const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || ''
    const shouldTrack = Boolean(gaMeasurementId && (!productionHostname || requestHostname === productionHostname))

    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=86400')

    return {
      props: {
        story,
        gaMeasurementId: shouldTrack ? gaMeasurementId : '',
      },
    }
  } catch {
    return { notFound: true }
  }
}

export default function WebStoryAmpPage({ story, gaMeasurementId }) {
  const slides = getSlides(story)
  const description = getDescription(story, slides)
  const canonical = getCanonical(story)
  const logoUrl = getPublicationLogoUrl()
  const articleUrl = story.related_article_slug
    ? absoluteUrl(`/${story.categories?.slug || 'news'}/${story.related_article_slug}`)
    : ''
  const schemas = buildSchemas(story, slides, canonical)
  const analyticsConfig = gaMeasurementId ? buildAmpAnalyticsConfig(gaMeasurementId) : null
  const ampStoryAdsConfig = buildAmpStoryAdsConfig()
  const canShowStoryAds = Boolean(ampStoryAdsConfig && (slides.length + 1) >= 7)

  return (
    <>
      <Head>
        <title>{story.seo_title || story.title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={story.seo_title || story.title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        {story.cover_image ? <meta property="og:image" content={story.cover_image} /> : null}
        {story.cover_image_alt ? <meta property="og:image:alt" content={story.cover_image_alt} /> : null}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={story.seo_title || story.title} />
        <meta name="twitter:description" content={description} />
        {story.cover_image ? <meta name="twitter:image" content={story.cover_image} /> : null}
        {story.cover_image_alt ? <meta name="twitter:image:alt" content={story.cover_image_alt} /> : null}
        <link rel="canonical" href={canonical} />

        <script key="schema-primary" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.primary) }} />
        <script key="schema-breadcrumb" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas.breadcrumb) }} />
      </Head>

      <style jsx global>{AMP_CUSTOM_CSS}</style>

      <amp-story
        standalone=""
        title={story.title}
        publisher="EkahNews"
        publisher-logo-src={logoUrl}
        poster-portrait-src={story.cover_image}
        poster-square-src={story.cover_image}
        poster-landscape-src={story.cover_image}
      >
        {canShowStoryAds ? (
          <amp-story-auto-ads>
            <script type="application/json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ampStoryAdsConfig) }} />
          </amp-story-auto-ads>
        ) : null}
        <amp-story-page id="cover" auto-advance-after="7s">
          <amp-story-grid-layer template="fill">
            <amp-img
              src={story.cover_image || slides[0]?.image}
              width="720"
              height="1280"
              layout="responsive"
              alt={story.cover_image_alt || story.title}
            />
          </amp-story-grid-layer>

          <amp-story-grid-layer template="vertical" class="scrim slide-shell">
            <h1 className="headline">{story.title}</h1>
            <p className="meta">{`${story.authors?.name || 'EkahNews'} | ${story.categories?.name || 'News'}`}</p>
          </amp-story-grid-layer>
        </amp-story-page>

        {slides.map((slide, index) => {
          const isCtaSlide = Boolean(slide?.cta_url || slide?.cta_text || slide?.whatsapp_group_url)
          const isVideoSlide = slide?.media_type === 'video' && slide?.video
          const pageId = `page-${index + 2}`
          const mediaId = `media-${index + 2}`
          const ctaHref = slide?.whatsapp_group_url || slide?.cta_url || articleUrl || ''
          const ctaText = slide?.whatsapp_group_url ? 'Join WhatsApp Community' : (slide?.cta_text || 'Read Full Story')

          return (
            <amp-story-page id={pageId} key={pageId} auto-advance-after={isVideoSlide ? mediaId : '7s'}>
              <amp-story-grid-layer template="fill">
                {isVideoSlide ? (
                  <amp-video
                    id={mediaId}
                    src={slide.video}
                    poster={slide.image || story.cover_image}
                    width="720"
                    height="1280"
                    layout="responsive"
                    autoplay=""
                  />
                ) : (
                  <amp-img
                    src={slide.image}
                    width="720"
                    height="1280"
                    layout="responsive"
                    alt={slide.image_alt || story.cover_image_alt || story.title}
                  />
                )}
              </amp-story-grid-layer>

              <amp-story-grid-layer template="vertical" class="scrim slide-shell">
                {!isCtaSlide ? (
                  <p className="body">{slide.description || description}</p>
                ) : (
                  <div className="cta-shell">
                    {ctaHref ? (
                      <p className={`cta-hint${slide?.whatsapp_group_url ? ' whatsapp' : ''}`}>{ctaText}</p>
                    ) : null}
                  </div>
                )}
              </amp-story-grid-layer>

              {ctaHref ? (
                <amp-story-page-outlink layout="nodisplay">
                  <a href={ctaHref} title={ctaText}>{ctaText}</a>
                </amp-story-page-outlink>
              ) : null}
            </amp-story-page>
          )
        })}

        {analyticsConfig ? (
          <amp-analytics type="gtag" data-credentials="include">
            <script type="application/json" dangerouslySetInnerHTML={{ __html: JSON.stringify(analyticsConfig) }} />
          </amp-analytics>
        ) : null}
      </amp-story>
    </>
  )
}
