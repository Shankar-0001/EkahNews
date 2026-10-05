'use client'

import { useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Play } from 'lucide-react'

const CONTROL_CLASS = 'absolute top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-[var(--c-accent)] dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800'

export default function HomeWebStoryRail({ stories = [] }) {
  const scrollRef = useRef(null)

  const scrollStories = (direction) => {
    const rail = scrollRef.current
    if (!rail) return

    rail.scrollBy({
      left: (direction === 'left' ? -1 : 1) * Math.round(rail.clientWidth * 0.8),
      behavior: 'smooth',
    })
  }

  if (!stories.length) return null

  return (
    <div className="relative">
      <button type="button" onClick={() => scrollStories('left')} className={`${CONTROL_CLASS} -left-10`} aria-label="Scroll web stories left">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div ref={scrollRef} className="flex gap-5 overflow-x-auto scroll-smooth px-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {stories.map((story) => (
          <Link key={story.id} href={`/web-stories/${story.slug}`} className="group block w-[220px] flex-none sm:w-[240px] lg:w-[280px]">
            <div className="relative aspect-[4/5] overflow-hidden bg-slate-100 dark:bg-slate-800">
              {story.featured_image_url || story.cover_image ? (
                <Image src={story.featured_image_url || story.cover_image} alt={story.title} fill className="object-cover" sizes="(max-width: 639px) 220px, (max-width: 1023px) 240px, 280px" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400 dark:text-slate-500">img</div>
              )}
              <div className="absolute left-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white">
                <Play className="h-3.5 w-3.5 fill-current" />
              </div>
            </div>
            <p className="mt-2 font-title text-[14px] font-semibold leading-snug text-[var(--c-heading)] line-clamp-2 group-hover:underline dark:text-white">{story.title}</p>
          </Link>
        ))}
      </div>
      <button type="button" onClick={() => scrollStories('right')} className={`${CONTROL_CLASS} -right-10`} aria-label="Scroll web stories right">
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  )
}
