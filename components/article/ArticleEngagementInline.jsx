"use client"

import { useEffect, useMemo, useState } from 'react'
import { Eye, Heart, Share2 } from 'lucide-react'

export default function ArticleEngagementInline({ articleId, articleUrl, articleTitle, type = 'article' }) {
  const [metrics, setMetrics] = useState({ views: 0, likes: 0, shares: 0 })
  const [formattedMetrics, setFormattedMetrics] = useState({ views: 0, likes: 0, shares: 0 })
  const [busy, setBusy] = useState(false)

  const encodedTitle = useMemo(() => encodeURIComponent(articleTitle || ''), [articleTitle])

  useEffect(() => {
    setFormattedMetrics({
      views: Number.isFinite(metrics.views) ? metrics.views.toLocaleString() : '0',
      likes: Number.isFinite(metrics.likes) ? metrics.likes.toLocaleString() : '0',
      shares: Number.isFinite(metrics.shares) ? metrics.shares.toLocaleString() : '0',
    })
  }, [metrics.likes, metrics.shares, metrics.views])

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
        // No-op
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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: articleTitle || '', text: articleTitle || '', url: articleUrl })
        await performAction('share')
        return
      } catch {
        // ignore
      }
    }

    try {
      await navigator.clipboard.writeText(articleUrl)
      await performAction('share')
    } catch {
      // ignore
    }
  }

  return (
    <div className="ml-auto flex flex-wrap items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-pink-700 text-white shadow-sm transition-colors hover:bg-pink-600">
          <Eye className="h-5 w-5" />
        </span>
        {formattedMetrics.views}
      </span>
      <button type="button" onClick={() => performAction('like')} className="inline-flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-pink-700 text-white shadow-sm transition-colors hover:bg-pink-600">
          <Heart className="h-5 w-5" />
        </span>
        {formattedMetrics.likes}
      </button>
      <button type="button" onClick={handleShare} className="inline-flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-pink-700 text-white shadow-sm transition-colors hover:bg-pink-600">
          <Share2 className="h-5 w-5" />
        </span>
        {formattedMetrics.shares}
      </button>
    </div>
  )
}
