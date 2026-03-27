'use client'

import { useEffect, useMemo, useState } from 'react'
import createDOMPurify from 'dompurify'
import { applyLinkPolicyToHtml } from '@/lib/link-policy'

function stripHtmlToText(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function sanitizeClientHtml(html = '', baseUrl) {
  if (typeof window === 'undefined') return ''

  const cleaned = createDOMPurify(window).sanitize(html || '', {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'style'],
    ALLOW_DATA_ATTR: false,
  })

  return applyLinkPolicyToHtml(cleaned, {
    baseUrl,
    nofollowExternal: true,
  })
}

export default function SafeHtml({ html = '', className = '', baseUrl }) {
  const serverSafeHtml = useMemo(() => {
    const text = stripHtmlToText(html)
    return text ? `<p>${text}</p>` : ''
  }, [html])

  const [sanitizedHtml, setSanitizedHtml] = useState(serverSafeHtml)

  useEffect(() => {
    setSanitizedHtml(sanitizeClientHtml(html, baseUrl) || serverSafeHtml)
  }, [baseUrl, html, serverSafeHtml])

  return <div className={className} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
}
