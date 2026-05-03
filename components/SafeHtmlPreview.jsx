'use client'

import { useEffect, useMemo, useState } from 'react'
import createDOMPurify from 'dompurify'
import { applyLinkPolicyToHtml } from '@/lib/link-policy'

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

export default function SafeHtmlPreview({ html = '', className = '', baseUrl }) {
  const [mounted, setMounted] = useState(false)
  const sanitizedHtml = useMemo(() => sanitizeClientHtml(html, baseUrl), [baseUrl, html])

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
}
