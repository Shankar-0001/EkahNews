'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import WebStoryCard from '@/components/content/WebStoryCard'

const INITIAL_VISIBLE = 4
const LOAD_MORE_COUNT = 4
const SIDE_BUTTON_CLASS = 'hidden md:inline-flex absolute top-1/2 z-10 h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--c-border)] bg-[var(--c-card-bg)] text-[var(--c-heading)] shadow-sm transition-colors hover:bg-slate-200 hover:text-[var(--c-accent)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white'

export default function WebStoriesRail({ stories = [] }) {
  const scrollRef = useRef(null)
  const [mounted, setMounted] = useState(false)
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE)

  useEffect(() => {
    setMounted(true)
  }, [])

  const visibleStories = useMemo(() => stories.slice(0, visibleCount), [stories, visibleCount])
  const canLoadMore = visibleCount < stories.length

  const scrollByAmount = (direction) => {
    if (!scrollRef.current) return

    const amount = Math.round(scrollRef.current.clientWidth * 0.8)
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    })
  }

  if (!mounted || stories.length === 0) return null

  return (
    <div className="relative overflow-visible rounded-xl border border-[var(--c-border)] bg-[var(--c-card-bg)] p-[15px] shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => scrollByAmount('left')}
        className={SIDE_BUTTON_CLASS + ' left-0 -translate-x-1/2'}
        aria-label="Scroll web stories left"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => scrollByAmount('right')}
        className={SIDE_BUTTON_CLASS + ' right-0 translate-x-1/2'}
        aria-label="Scroll web stories right"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scroll-smooth pl-1 pr-0 md:pl-4 md:pr-10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {visibleStories.map((story) => (
          <div key={story.id} className="min-w-[220px] max-w-[220px] flex-none sm:min-w-[240px] sm:max-w-[240px] lg:min-w-[255px] lg:max-w-[255px]">
            <WebStoryCard story={story} />
          </div>
        ))}
      </div>

      {canLoadMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => Math.min(count + LOAD_MORE_COUNT, stories.length))}
            className="inline-flex min-w-[190px] items-center justify-center rounded-full border border-[var(--c-border)] bg-[var(--c-card-bg)] px-6 py-3 font-sans text-[12px] font-semibold text-[var(--c-muted)] transition-colors hover:border-[var(--c-border)] hover:bg-slate-50 hover:text-[var(--c-heading)] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-slate-500 dark:hover:bg-slate-800"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  )
}
