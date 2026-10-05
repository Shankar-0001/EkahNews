'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArticleImage, getEditorialArticleHref } from '@/components/home/editorialUtils'

const MAX_VISIBLE_ARTICLES = 8

function SidebarItem({ article }) {
  return (
    <article>
      <Link
        href={getEditorialArticleHref(article)}
        className="grid grid-cols-[86px_1fr] gap-3 border-b border-[var(--c-border)] py-3 last:border-b-0 dark:border-slate-800"
      >
        <ArticleImage article={article} className="h-[54px] w-[86px]" sizes="86px" />
        <p className="font-title text-[13px] font-semibold leading-snug text-[var(--c-heading)] line-clamp-3 dark:text-white">
          {article.title}
        </p>
      </Link>
    </article>
  )
}

export default function MoreNewsSidebar({ articles = [] }) {
  const [activeFilter, setActiveFilter] = useState('all')

  const visibleArticles = useMemo(() => {
    const filteredArticles = activeFilter === 'crypto'
      ? articles.filter((article) => article.categories?.slug === 'cryptocurrency')
      : articles

    return filteredArticles.slice(0, MAX_VISIBLE_ARTICLES)
  }, [activeFilter, articles])

  return (
    <aside className="border border-[var(--c-border)] bg-[var(--c-card-bg)] px-[15px] py-[15px] dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between pb-[15px]">
        <p className="font-sans text-[18px] font-bold tracking-[-0.03em] text-[var(--c-heading)] dark:text-slate-200">
          More News
        </p>
        <nav aria-label="More News filters" className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            aria-pressed={activeFilter === 'all'}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center px-2 font-sans text-[12px] font-semibold ${activeFilter === 'all' ? 'text-[var(--c-heading)] dark:text-white' : 'text-[#6b7280] hover:text-[var(--c-accent)] dark:text-slate-400'}`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('crypto')}
            aria-pressed={activeFilter === 'crypto'}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center px-2 font-sans text-[12px] font-semibold ${activeFilter === 'crypto' ? 'text-[var(--c-heading)] dark:text-white' : 'text-[#6b7280] hover:text-[var(--c-accent)] dark:text-slate-400'}`}
          >
            Crypto
          </button>
        </nav>
      </div>
      <div>
        {visibleArticles.map((article) => (
          <SidebarItem key={article.id} article={article} />
        ))}
        {visibleArticles.length === 0 ? (
          <p className="py-3 font-sans text-[12px] text-[var(--c-muted)] dark:text-slate-400">
            No crypto news available.
          </p>
        ) : null}
      </div>
    </aside>
  )
}
