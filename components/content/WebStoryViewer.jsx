'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react'
import Image from 'next/image'
import { getAnchorPropsForHref } from '@/lib/link-policy'

const AUTO_MS = 5000

function formatStoryTime(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getSlideDuration(slide) {
  if (slide?.media_type === 'video') {
    const seconds = Number(slide?.video_duration)
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.round(seconds * 1000)
    }
  }
  return AUTO_MS
}

function isValidWhatsappUrl(url) {
  return typeof url === 'string'
    && /^https:\/\/chat\.whatsapp\.com\//i.test(url.trim())
}

function getResolvedStoryHref(value, fallback = '') {
  if (!value || typeof value !== 'string') return fallback
  const normalized = value.trim()
  if (!normalized || normalized === '/web-stories') return fallback
  return normalized
}

export default function WebStoryViewer({ story, articleUrl }) {
  const slides = useMemo(() => {
    const storySlides = Array.isArray(story?.slides) ? story.slides.filter((slide) => slide?.image || slide?.video) : []
    const coverSlide = {
      image: story?.cover_image || storySlides[0]?.image || '',
      image_alt: story?.cover_image_alt || story?.title || 'Web story cover',
      isCover: true,
    }
    return [coverSlide, ...storySlides]
  }, [story])
  const [index, setIndex] = useState(0)
  const [metrics, setMetrics] = useState({ views: 0, likes: 0, shares: 0 })
  const [touchStartX, setTouchStartX] = useState(null)

  const authorName = story?.authors?.name || 'EkahNews'
  const categoryName = story?.categories?.name || 'News'
  const storyTime = formatStoryTime(story?.published_at || story?.updated_at)
  const current = slides[index] || {}
  const isCoverSlide = Boolean(current?.isCover)
  const whatsappHref = isValidWhatsappUrl(current?.whatsapp_group_url) ? current.whatsapp_group_url.trim() : ''
  const directCtaHref = getResolvedStoryHref(current?.cta_url, '')
  const ctaHref = whatsappHref || directCtaHref || (
    current?.cta_text
      ? (articleUrl || `/web-stories/${story?.slug || ''}`)
      : ''
  )
  const isWhatsappSlide = Boolean(whatsappHref)
  const isReadMoreSlide = !isCoverSlide && !isWhatsappSlide && Boolean(current?.cta_text || directCtaHref)
  const isVideoSlide = !isCoverSlide && current?.media_type === 'video' && current?.video
  const progressWidth = `${((index + 1) / Math.max(1, slides.length)) * 100}%`
  const ctaLinkProps = getAnchorPropsForHref(ctaHref)
  const whatsappLinkProps = getAnchorPropsForHref(whatsappHref)

  useEffect(() => {
    if (!story?.id) return
    fetch(`/api/engagement?id=${story.id}&type=story`)
      .then((res) => res.json())
      .then((payload) => setMetrics(payload?.data?.metrics || { views: 0, likes: 0, shares: 0 }))
      .catch(() => null)

    fetch('/api/engagement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: story.id, type: 'story', action: 'view' }),
    }).catch(() => null)
  }, [story?.id])

  useEffect(() => {
    if (slides.length < 2) return
    const timer = setTimeout(() => {
      setIndex((prev) => (prev + 1) % slides.length)
    }, getSlideDuration(current))
    return () => clearTimeout(timer)
  }, [current, index, slides.length])

  const handleLike = async () => {
    const response = await fetch('/api/engagement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: story.id, type: 'story', action: 'like' }),
    })
    const payload = await response.json()
    if (payload?.data?.metrics) setMetrics(payload.data.metrics)
  }

  const next = () => setIndex((prev) => Math.min(slides.length - 1, prev + 1))
  const prev = () => setIndex((prev) => Math.max(0, prev - 1))

  return (
    <div className="mx-auto max-w-sm md:max-w-md lg:max-w-lg">
      <div className="mb-3 h-1.5 w-full rounded bg-gray-200 dark:bg-gray-700">
        <div className="h-full rounded bg-blue-600 transition-all" style={{ width: progressWidth }} />
      </div>

      <div
        className="relative overflow-hidden rounded-2xl border border-gray-200 bg-black aspect-[9/16] dark:border-gray-700"
        onTouchStart={(e) => setTouchStartX(e.changedTouches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const endX = e.changedTouches[0]?.clientX
          if (touchStartX == null || typeof endX !== 'number') return
          const delta = endX - touchStartX
          if (delta > 40) prev()
          if (delta < -40) next()
          setTouchStartX(null)
        }}
      >
        {isVideoSlide ? (
          <video
            key={current.video}
            src={current.video}
            poster={current.image || story?.cover_image || ''}
            className="h-full w-full object-cover"
            autoPlay
            muted
            playsInline
            preload="metadata"
          />
        ) : current?.image ? (
          <Image
            src={current.image}
            alt={current.image_alt || story.title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 420px"
            priority={index === 0}
          />
        ) : (
          <div className="h-full w-full bg-gray-800" />
        )}

        <button className="absolute inset-y-0 left-0 w-1/2" onClick={prev} aria-label="Previous slide" />
        <button className="absolute inset-y-0 right-0 w-1/2" onClick={next} aria-label="Next slide" />

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent p-4 text-white">
          {isCoverSlide && (
            <>
              <h2 className="text-lg font-bold leading-snug">{story.title}</h2>
              <p className="mt-2 text-sm text-gray-200">{`${authorName} | ${categoryName}`}</p>
              {storyTime ? <p className="mt-1 text-xs text-gray-300">{storyTime}</p> : null}
            </>
          )}

          {!isCoverSlide && !isReadMoreSlide && !isWhatsappSlide && current?.description && (
            <p className="text-sm leading-6 text-gray-100">{current.description}</p>
          )}

          {isReadMoreSlide && (
            <div className="mt-3 text-center">
              <a
                href={ctaHref}
                {...ctaLinkProps}
                className="inline-flex rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-400"
              >
                {current.cta_text || 'Read More'}
              </a>
            </div>
          )}

          {isWhatsappSlide && (
            <div className="mt-3 text-center">
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  {...whatsappLinkProps}
                  className="inline-flex rounded-full bg-green-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-400"
                >
                  Join Our WhatsApp Community
                </a>
              ) : (
                <span className="inline-flex rounded-full bg-green-500 px-4 py-2 text-sm font-semibold text-white">
                  Join Our WhatsApp Community
                </span>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-gray-200">
              <span>{metrics.views || 0} views</span>
              <span>{metrics.likes || 0} likes</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={handleLike}><Heart className="mr-1 h-4 w-4" />Like</Button>
            </div>
          </div>
        </div>

        <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white" aria-label="Previous">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white" aria-label="Next">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
