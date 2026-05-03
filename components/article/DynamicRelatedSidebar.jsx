'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { format } from 'date-fns'

function normalizeStory(story) {
  if (!story) return null

  const categorySlug = story.categorySlug || story.categories?.slug || story.category?.slug || 'news'
  const imageUrl = story.featured_image_url || story.image || story.thumbnail || ''
  const authorName = story.authors?.name || story.author?.name || story.authorName || ''
  const publishedAt = story.published_at || story.publishedAt || story.createdAt || ''

  return {
    slug: story.slug,
    title: story.title,
    categorySlug,
    imageUrl,
    authorName,
    publishedAt,
  }
}

function RelatedStoryCard({ story, formattedDate = '' }) {
  const href = `/${story.categorySlug}/${story.slug}`

  return (
    <Link
      href={href}
      className="group flex items-start gap-3 border-b border-slate-100 pb-4 last:border-b-0 last:pb-0 dark:border-slate-800"
    >
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
        {story.imageUrl ? (
          <Image
            src={story.imageUrl}
            alt={story.title || 'Related story image'}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            News
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-3 text-sm font-semibold leading-5 text-slate-900 group-hover:underline group-hover:underline-offset-4 dark:text-white">
          {story.title}
        </p>
        {(story.authorName || formattedDate) && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {story.authorName}
            {story.authorName && formattedDate ? ' | ' : ''}
            {formattedDate}
          </p>
        )}
      </div>
    </Link>
  )
}

export default function DynamicRelatedSidebar({
  initialArticleSlug,
  initialCategorySlug,
  initialRelatedStories = [],
}) {
  const [stories, setStories] = useState(() => initialRelatedStories.map(normalizeStory).filter(Boolean))
  const [isFading, setIsFading] = useState(false)
  const [formattedDates, setFormattedDates] = useState({})
  const currentSlugRef = useRef(initialArticleSlug)

  const fallbackCategorySlug = useMemo(() => initialCategorySlug || 'news', [initialCategorySlug])

  useEffect(() => {
    const nextDates = {}
    stories.forEach((story) => {
      if (!story?.slug || !story?.publishedAt) return
      nextDates[story.slug] = format(new Date(story.publishedAt), 'MMM d, yyyy')
    })
    setFormattedDates(nextDates)
  }, [stories])

  useEffect(() => {
    const handleArticleChange = async (event) => {
      const slug = event?.detail?.slug
      const categorySlug = event?.detail?.categorySlug || fallbackCategorySlug

      if (!slug || slug === currentSlugRef.current) {
        return
      }

      currentSlugRef.current = slug
      setIsFading(true)

      try {
        const params = new URLSearchParams({
          slug,
          category: categorySlug,
          limit: '3',
        })

        const response = await fetch(`/api/related-articles?${params.toString()}`, {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error(`Failed to load related stories for ${slug}`)
        }

        const data = await response.json()
        const nextStories = (data.articles || [])
          .map(normalizeStory)
          .filter(Boolean)
          .slice(0, 3)

        setStories(nextStories)
      } catch (error) {
        console.error('[DynamicRelatedSidebar] fetch error:', error)
      } finally {
        window.setTimeout(() => {
          setIsFading(false)
        }, 150)
      }
    }

    window.addEventListener('ekah:article-change', handleArticleChange)
    return () => window.removeEventListener('ekah:article-change', handleArticleChange)
  }, [fallbackCategorySlug])

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        Related Stories
      </p>
      <div
        className="mt-4 space-y-4"
        style={{
          opacity: isFading ? 0 : 1,
          transition: 'opacity 0.15s ease-in-out',
        }}
      >
        {stories.slice(0, 3).map((story) => (
          <RelatedStoryCard key={story.slug} story={story} formattedDate={formattedDates[story.slug] || ''} />
        ))}
      </div>
    </div>
  )
}
