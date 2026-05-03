import { sanitizeStoredHtml } from '@/lib/html-sanitizer'
import { applyLinkPolicyToHtml } from '@/lib/link-policy'

export default function SafeHtml({ html = '', className = '', baseUrl }) {
  if (!html) return null

  const sanitizedHtml = applyLinkPolicyToHtml(sanitizeStoredHtml(html), {
    baseUrl,
    nofollowExternal: true,
  })

  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
}
