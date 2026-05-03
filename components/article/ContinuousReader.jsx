'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import InlineArticleRenderer from './InlineArticleRenderer'
import { InArticleAd } from '@/components/ads/AdComponent'
import { getAdSlotIds, hasRenderableAdSlot } from '@/lib/ads'

const MAX_ADDITIONAL_ARTICLES = 5

export default function ContinuousReader({
  initialSlug,
  initialCategorySlug,
  initialTitle,
}) {
  const [articles, setArticles] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const shouldRenderInlineAd = useMemo(() => {
    const slotIds = getAdSlotIds()
    return hasRenderableAdSlot(slotIds.inArticle)
  }, [])

  const loadedSlugs = useRef(new Set([initialSlug]))
  const sentinelRef = useRef(null)
  const visibilityMapRef = useRef(new Map())
  const activeUrlRef = useRef(`/${initialCategorySlug}/${initialSlug}`)
  const activeSlugRef = useRef(initialSlug)

  const titleSuffix = useMemo(() => ' | EkahNews', [])

  const notifyArticleChange = useCallback((slug, categorySlug, title) => {
    if (typeof window === 'undefined' || !slug || !categorySlug) return

    window.dispatchEvent(new CustomEvent('ekah:article-change', {
      detail: {
        slug,
        categorySlug,
        title,
      },
    }))
  }, [])

  const fetchNextArticle = useCallback(async () => {
    if (isLoading || isDone || articles.length >= MAX_ADDITIONAL_ARTICLES) {
      return
    }

    const lastSlug = articles.length > 0 ? articles[articles.length - 1].slug : initialSlug
    setIsLoading(true)

    try {
      const params = new URLSearchParams({
        slug: lastSlug,
        category: initialCategorySlug,
        limit: '1',
        exclude: Array.from(loadedSlugs.current).join(','),
      })

      const response = await fetch(`/api/related-articles?${params.toString()}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const data = await response.json()
      const nextArticle = (data.articles || []).find((item) => item?.slug && !loadedSlugs.current.has(item.slug))

      if (!nextArticle) {
        setIsDone(true)
        return
      }

      loadedSlugs.current.add(nextArticle.slug)
      setArticles((current) => {
        const updated = [...current, nextArticle]
        if (updated.length >= MAX_ADDITIONAL_ARTICLES) {
          setIsDone(true)
        }
        return updated
      })
    } catch (error) {
      console.error('[ContinuousReader] fetch error:', error)
      setIsDone(true)
    } finally {
      setIsLoading(false)
    }
  }, [articles, initialCategorySlug, initialSlug, isDone, isLoading])

  useEffect(() => {
    if (!sentinelRef.current || isDone) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextArticle()
        }
      },
      {
        rootMargin: '400px 0px',
        threshold: 0,
      }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [fetchNextArticle, isDone])

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll('[data-article-url]'))
    if (sections.length === 0) return

    const updateActiveArticle = () => {
      let winner = null
      let highestRatio = 0

      for (const [element, ratio] of visibilityMapRef.current.entries()) {
        if (ratio > highestRatio) {
          highestRatio = ratio
          winner = element
        }
      }

      if (!winner) return

      const url = winner.getAttribute('data-article-url')
      const title = winner.getAttribute('data-article-title') || initialTitle
      const slug = winner.getAttribute('data-article-slug')
      const categorySlug = winner.getAttribute('data-article-category')

      if (!url) return

      if (activeUrlRef.current !== url) {
        activeUrlRef.current = url
        window.history.replaceState(null, '', url)
      }

      if (title && document.title !== `${title}${titleSuffix}`) {
        document.title = `${title}${titleSuffix}`
      }

      if (slug && categorySlug && activeSlugRef.current !== slug) {
        activeSlugRef.current = slug
        notifyArticleChange(slug, categorySlug, title)
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visibilityMapRef.current.set(entry.target, entry.isIntersecting ? entry.intersectionRatio : 0)
        })
        updateActiveArticle()
      },
      {
        threshold: [0.1, 0.3, 0.5, 0.7, 0.9],
      }
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [articles, initialTitle, notifyArticleChange, titleSuffix])

  return (
    <div className="space-y-0">
      {articles.map((article) => (
        <div key={article.slug} style={{ marginTop: 0, paddingTop: 0 }}>
          <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />

          {/* Skip the wrapper entirely when no live in-article ad is configured. */}
          {shouldRenderInlineAd && (
            <div style={{ margin: '1rem 0' }}>
              <InArticleAd />
            </div>
          )}

          <InlineArticleRenderer article={article} />
        </div>
      ))}

      {!isDone && (
        <div
          ref={sentinelRef}
          style={{ height: '1px', visibility: 'hidden' }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
