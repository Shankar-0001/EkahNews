'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Clock3, User } from 'lucide-react'
import { format } from 'date-fns'
import { InArticleAd } from '@/components/ads/AdComponent'
import { formatArticleCardDate } from '@/lib/date-utils'
import { getAdSlotIds, hasRenderableAdSlot } from '@/lib/ads'

const DEFAULT_PAGE_SIZE = 12
const AD_INSERT_FREQUENCY = 6

function getFeedItemKey(item) {
  return `${item?._type || 'item'}-${item?.id || item?.slug || 'unknown'}`
}

function getItemHref(item) {
  return item?._type === 'web_story'
    ? `/web-stories/${item.slug}`
    : `/${item.categories?.slug || 'news'}/${item.slug}`
}

function LatestArticleRow({ item, formattedDate = '' }) {
  return (
    <Link
      href={getItemHref(item)}
      className="grid gap-4 border-b border-slate-200 pb-4 transition-colors hover:bg-slate-50 md:grid-cols-[220px_minmax(0,1fr)] dark:border-slate-800 dark:hover:bg-slate-900/60"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
        {item.featured_image_url ? (
          <Image
            src={item.featured_image_url}
            alt={item.featured_image_alt || item.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 220px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400 dark:text-slate-500">
            No image
          </div>
        )}
      </div>

      <div className="min-w-0 py-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          <span>{item.categories?.name || 'News'}</span>
          {formattedDate && <span>{formattedDate}</span>}
        </div>

        <h2 className="mt-2 text-xl font-bold leading-snug text-slate-900 dark:text-white">
          {item.title}
        </h2>

        {item.excerpt && (
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400 md:text-base">
            {item.excerpt}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          {item.authors?.name && (
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {item.authors.name}
            </span>
          )}
          {item.published_at && (
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              {formatArticleCardDate(item.published_at)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function LatestWebStoryRow({ item, formattedDate = '' }) {
  return (
    <Link
      href={getItemHref(item)}
      className="grid gap-4 border-b border-slate-200 pb-4 transition-colors hover:bg-slate-50 md:grid-cols-[220px_minmax(0,1fr)] dark:border-slate-800 dark:hover:bg-slate-900/60"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
        {item.cover_image ? (
          <Image
            src={item.cover_image}
            alt={item.cover_image_alt || item.title || 'Web story cover'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 220px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400 dark:text-slate-500">
            No image
          </div>
        )}
      </div>

      <div className="min-w-0 py-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-[#d62828] dark:text-red-400">Web Story</span>
          {item.categories?.name && <span>{item.categories.name}</span>}
          {formattedDate && <span>{formattedDate}</span>}
        </div>

        <h2 className="mt-2 text-xl font-bold leading-snug text-slate-900 dark:text-white">
          {item.title}
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400 md:text-base">
          Swipe through the latest visual story coverage from EkahNews.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          {item.authors?.name && (
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {item.authors.name}
            </span>
          )}
          {item.published_at && (
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              {formatArticleCardDate(item.published_at)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function FeedRow({ item, formattedDate = '' }) {
  return item?._type === 'web_story'
    ? <LatestWebStoryRow item={item} formattedDate={formattedDate} />
    : <LatestArticleRow item={item} formattedDate={formattedDate} />
}

export default function LatestFeedList({
  initialItems = [],
  initialHasMore = false,
  pageSize = DEFAULT_PAGE_SIZE,
}) {
  const [items, setItems] = useState(initialItems)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formattedDates, setFormattedDates] = useState({})
  const sentinelRef = useRef(null)
  const shouldRenderInlineAd = useMemo(() => {
    const slotIds = getAdSlotIds()
    return hasRenderableAdSlot(slotIds.inArticle)
  }, [])

  const loadNextPage = useCallback(async () => {
    if (loading || !hasMore) return

    setLoading(true)
    setLoadError('')

    try {
      const nextPage = currentPage + 1
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: String(pageSize),
      })

      const response = await fetch(`/api/latest-feed?${params.toString()}`, {
        cache: 'no-store',
      })

      if (!response.ok && response.status !== 429) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const payload = await response.json()
      const nextItems = Array.isArray(payload?.items) ? payload.items : []

      if (nextItems.length === 0) {
        setHasMore(false)
        return
      }

      setItems((current) => {
        const knownKeys = new Set(current.map(getFeedItemKey))
        const deduped = nextItems.filter((item) => !knownKeys.has(getFeedItemKey(item)))
        return deduped.length > 0 ? [...current, ...deduped] : current
      })
      setCurrentPage(nextPage)
      setHasMore(Boolean(payload?.hasMore))
    } catch (error) {
      console.error('[LatestFeedList] load error:', error)
      setLoadError('We could not load more stories right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [currentPage, hasMore, loading, pageSize])

  useEffect(() => {
    const nextDates = {}
    items.forEach((item) => {
      if (!item?.published_at) return
      nextDates[getFeedItemKey(item)] = format(new Date(item.published_at), 'MMM d, yyyy')
    })
    setFormattedDates(nextDates)
  }, [items])

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadNextPage()
        }
      },
      {
        rootMargin: '500px 0px',
        threshold: 0,
      }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadNextPage])

  if (items.length === 0) {
    return null
  }

  return (
    <section className="space-y-4">
      {items.map((item, index) => (
        <div key={getFeedItemKey(item)}>
          <FeedRow item={item} formattedDate={formattedDates[getFeedItemKey(item)] || ''} />
          {shouldRenderInlineAd && (index + 1) % AD_INSERT_FREQUENCY === 0 && index < items.length - 1 && (
            <div className="border-b border-slate-200 py-4 dark:border-slate-800">
              <InArticleAd />
            </div>
          )}
        </div>
      ))}

      {loadError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadError}
        </div>
      )}

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4" aria-hidden="true">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {loading ? 'Loading more stories...' : 'Scroll for more'}
          </div>
        </div>
      )}
    </section>
  )
}
