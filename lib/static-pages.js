import { createAdminClient } from '@/lib/supabase/admin'
import { applyLinkPolicyToHtml } from '@/lib/link-policy'
import { sanitizeRichText } from '@/lib/security-utils'

export const STATIC_PAGE_DEFINITIONS = [
  {
    slug: 'about-us',
    label: 'About',
    section: 'Company',
    title: 'About EkahNews',
    seoTitle: 'About Us - EkahNews',
    seoDescription: 'Learn about EkahNews, our newsroom values, and our commitment to responsible journalism.',
    defaultHtml: [
      '<p>EkahNews delivers timely, reliable coverage across major categories with a focus on clarity, context, and public value. Our newsroom prioritizes accuracy, transparency, and reader trust.</p>',
      '<p>We combine human editorial judgment with data-informed workflows to surface stories that matter while maintaining strong editorial standards.</p>',
      '<p>If you have questions about our coverage or want to suggest a story, please reach out via our contact page.</p>',
    ].join(''),
  },
  {
    slug: 'contact',
    label: 'Contact',
    section: 'Company',
    title: 'Contact',
    seoTitle: 'Contact - EkahNews',
    seoDescription: 'Contact the EkahNews editorial and support teams.',
    defaultHtml: [
      '<p>For editorial feedback, corrections, or general inquiries, please reach out to our newsroom team.</p>',
      '<p>To report a technical issue with the site, include the article URL and a brief description of the problem.</p>',
      '<p>We review messages regularly and respond as quickly as possible.</p>',
    ].join(''),
  },
  {
    slug: 'editorial-policy',
    label: 'Editorial Policy',
    section: 'Company',
    title: 'Editorial Policy',
    seoTitle: 'Editorial Policy - EkahNews',
    seoDescription: 'Read EkahNews editorial standards, sourcing guidelines, and content policies.',
    defaultHtml: [
      '<p>EkahNews is committed to factual, fair, and transparent journalism. Our reporting is guided by verification, accountability, and independence from outside influence.</p>',
      '<p>We prioritize primary sources, corroboration, and clear attribution. When new information emerges, we update coverage promptly and note significant changes.</p>',
      '<p>Opinions, analysis, and explainers are labeled clearly. Sponsored content and advertisements are separated from editorial content.</p>',
    ].join(''),
  },
  {
    slug: 'corrections-policy',
    label: 'Corrections Policy',
    section: 'Company',
    title: 'Corrections Policy',
    seoTitle: 'Corrections Policy - EkahNews',
    seoDescription: 'How EkahNews handles corrections, clarifications, and updates.',
    defaultHtml: [
      '<p>EkahNews corrects factual errors as quickly as possible. When we update a story, we note significant changes to help readers understand what was modified.</p>',
      '<p>If you believe an article contains an error, please contact us with the URL and a clear explanation of the issue. Our editorial team will review and respond promptly.</p>',
      '<p>Clarifications that do not change the overall understanding of a story may be added without a formal correction note.</p>',
    ].join(''),
  },
  {
    slug: 'advertise',
    label: 'Advertise With Us',
    section: 'Company',
    title: 'Advertise With Us',
    seoTitle: 'Advertise With Us - EkahNews',
    seoDescription: 'Partner with EkahNews to reach engaged readers across key news categories.',
    defaultHtml: [
      '<p>EkahNews offers brand-safe placements and engaged audiences across major news categories. We work with partners to build sponsorships that respect editorial independence.</p>',
      '<p>For media kits, audience insights, and advertising options, please contact our partnerships team with your campaign goals and timeline.</p>',
      '<p>We review every request and will respond with available options, pricing, and recommended placements.</p>',
    ].join(''),
  },
  {
    slug: 'privacy',
    label: 'Privacy Policy',
    section: 'Resources',
    title: 'Privacy Policy',
    seoTitle: 'Privacy Policy - EkahNews',
    seoDescription: 'Privacy policy for EkahNews.',
    defaultHtml: [
      '<p>We collect only the data required to provide and improve EkahNews services.</p>',
      '<p>Authentication and account data are managed securely through Supabase.</p>',
      '<p>Analytics and engagement signals (views, likes, shares) are used for content ranking and product improvements.</p>',
      '<p>You can contact the site administrator for data access, correction, or deletion requests.</p>',
    ].join(''),
  },
  {
    slug: 'terms',
    label: 'Terms of Service',
    section: 'Resources',
    title: 'Terms of Service',
    seoTitle: 'Terms of Service - EkahNews',
    seoDescription: 'Terms of service for EkahNews.',
    defaultHtml: [
      '<p>By using EkahNews, you agree to follow applicable laws and platform usage rules.</p>',
      '<p>All published content remains the responsibility of its author and editorial team.</p>',
      '<p>Unauthorized copying, scraping, or misuse of content is prohibited.</p>',
      '<p>EkahNews may update these terms as the product evolves.</p>',
    ].join(''),
  },
  {
    slug: 'sitemap',
    label: 'Sitemap (XML)',
    section: 'Resources',
    title: 'Sitemap',
    seoTitle: 'Sitemap - EkahNews',
    seoDescription: 'The EkahNews XML sitemap is generated automatically.',
    editable: false,
    href: '/sitemap.xml',
  },
]

export const STATIC_PAGE_SLUGS = new Set(STATIC_PAGE_DEFINITIONS.map((page) => page.slug))

export function getStaticPageDefinition(slug) {
  return STATIC_PAGE_DEFINITIONS.find((page) => page.slug === slug) || null
}

export async function getStaticPageOverride(slug) {
  if (!slug) return null
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('static_pages')
    .select('slug, title, seo_title, seo_description, content_html, content_json, updated_at')
    .eq('slug', slug)
    .maybeSingle()

  return data || null
}

export function getRenderableHtml(html = '') {
  const sanitized = sanitizeRichText(html)
  return applyLinkPolicyToHtml(sanitized)
}

export function mergeStaticPage(definition, override) {
  if (!definition) return null
  return {
    ...definition,
    ...override,
    content_html: override?.content_html ?? definition.defaultHtml ?? '',
    content_json: override?.content_json ?? null,
    seo_title: override?.seo_title ?? definition.seoTitle ?? '',
    seo_description: override?.seo_description ?? definition.seoDescription ?? '',
    title: override?.title ?? definition.title ?? '',
    hasOverride: Boolean(override),
  }
}
