'use client'

import { useEffect, useMemo, useState } from 'react'
import { Heart, Eye, Share2, Link as LinkIcon, Facebook, Twitter, Linkedin } from 'lucide-react'

export default function ArticleEngagementBar({ articleId, articleUrl, articleTitle, type = 'article' }) {
  const [metrics, setMetrics] = useState({ views: 0, likes: 0, shares: 0 })
  const [busy, setBusy] = useState(false)

  const formatMetric = (value) => (Number.isFinite(value) ? value.toLocaleString() : '0')

  const encodedUrl = useMemo(() => encodeURIComponent(articleUrl), [articleUrl])
  const encodedTitle = useMemo(() => encodeURIComponent(articleTitle || ''), [articleTitle])

  useEffect(() => {
    if (!articleId) return

    let isMounted = true
    ;(async () => {
      try {
        await fetch('/api/engagement', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: articleId, action: 'view', type }),
        })
        const res = await fetch(`/api/engagement?id=${encodeURIComponent(articleId)}&type=${encodeURIComponent(type)}`)
        const json = await res.json()
        if (isMounted && res.ok) setMetrics(json.data?.metrics || metrics)
      } catch {
        // No-op: avoid hard failures in UI
      }
    })()

    return () => {
      isMounted = false
    }
  }, [articleId])

  const performAction = async (action) => {
    if (!articleId || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/engagement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: articleId, action, type }),
      })
      const json = await res.json()
      if (res.ok) {
        setMetrics(json.data?.metrics || metrics)
      }
    } finally {
      setBusy(false)
    }
  }

  const openShare = async (url) => {
    window.open(url, '_blank', 'noopener,noreferrer,width=640,height=640')
    await performAction('share')
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(articleUrl)
      await performAction('share')
    } catch {
      // ignore
    }
  }

  return (
    <section className="mb-8 border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700 dark:text-gray-300">
        <span className="inline-flex items-center gap-1.5"><Eye className="h-4 w-4" /> {formatMetric(metrics.views)}</span>
        <button onClick={() => performAction('like')} className="inline-flex items-center gap-1.5 hover:text-red-600">
          <Heart className="h-4 w-4" /> {formatMetric(metrics.likes)}
        </button>
        <span className="inline-flex items-center gap-1.5"><Share2 className="h-4 w-4" /> {formatMetric(metrics.shares)}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={() => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-accent"><Facebook className="h-3.5 w-3.5" /> Facebook</button>
        <button onClick={() => openShare(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`)} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-accent"><Twitter className="h-3.5 w-3.5" /> Twitter</button>
        <button onClick={() => openShare(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`)} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-accent"><Linkedin className="h-3.5 w-3.5" /> LinkedIn</button>
        <button onClick={() => openShare(`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`)} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-accent">WhatsApp</button>
        <button onClick={copyLink} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-accent"><LinkIcon className="h-3.5 w-3.5" /> Copy Link</button>
      </div>
    </section>
  )
}

