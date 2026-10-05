import Image from 'next/image'
import { Clock3 } from 'lucide-react'
import { formatArticleCardDate } from '@/lib/date-utils'

export function getEditorialArticleHref(article) {
  return `/${article?.categories?.slug || 'news'}/${article?.slug}`
}

export function ArticleImage({
  article,
  className = '',
  sizes = '100vw',
  priority = false,
  altOverride = '',
}) {
  const src = article?.featured_image_url || article?.cover_image || ''
  const alt = altOverride || article?.title || 'Article image'

  return (
    <div className={`relative overflow-hidden bg-slate-100 dark:bg-slate-800 ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          className="object-cover"
          sizes={sizes}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400 dark:text-slate-500">
          Image
        </div>
      )}
    </div>
  )
}

export function ArticleMeta({ article, compact = false }) {
  if (!article) return null

  return (
    <div className={`mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-sans ${compact ? 'text-[10px]' : 'text-[12px]'} font-semibold text-[#6b7280] dark:text-slate-400`}>
      {article.published_at ? (
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-3 w-3 text-[var(--c-accent)] dark:text-slate-300" />
          {formatArticleCardDate(article.published_at)}
        </span>
      ) : null}
      {article.authors?.name ? <span>By {article.authors.name}</span> : null}
    </div>
  )
}
