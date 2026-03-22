'use client'

import { useMemo } from 'react'
import createDOMPurify from 'dompurify'
import { applyLinkPolicyToHtml } from '@/lib/link-policy'

export default function SafeHtml({ html = '', className = '', baseUrl }) {
  const sanitizedHtml = useMemo(() => {
    const cleaned = typeof window === 'undefined'
      ? (html || '')
      : createDOMPurify(window).sanitize(html || '', {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'style'],
        ALLOW_DATA_ATTR: false,
      })

    return applyLinkPolicyToHtml(cleaned, {
      baseUrl,
      nofollowExternal: true,
    })
  }, [baseUrl, html])

  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
}
