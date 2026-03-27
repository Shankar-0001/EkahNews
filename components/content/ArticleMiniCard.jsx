import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { Clock3 } from 'lucide-react'

export default function ArticleMiniCard({ article, compact = false, hideAuthor = false, hideExcerpt = false, imagePriority = false, squareImage = false }) {
  const href = `/${article.categories?.slug || 'news'}/${article.slug}`
  const authorName = article.authors?.name
  const imageAspectClass = squareImage ? 'aspect-square' : compact ? 'aspect-[4/3]' : 'aspect-[16/10]'
  const imageSizes = squareImage
    ? '(max-width: 768px) 100vw, 25vw'
    : compact
      ? '(max-width: 768px) 100vw, 33vw'
      : '(max-width: 1024px) 100vw, 25vw'

  return (
    <Link href={href} className="block h-full">
      <Card className="h-full overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
        {article.featured_image_url && (
          <div className={`relative w-full overflow-hidden bg-slate-100 dark:bg-slate-800 ${imageAspectClass}`}>
            <Image
              src={article.featured_image_url}
              alt={article.title || 'Article image'}
              fill
              className="object-cover transition-transform duration-500 hover:scale-[1.03]"
              sizes={imageSizes}
              priority={imagePriority}
              loading={imagePriority ? 'eager' : undefined}
            />
          </div>
        )}
        <div className="p-4 md:p-5">
          {article.categories?.name && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d62828] dark:text-red-400">
              {article.categories.name}
            </p>
          )}
          <h3 className={`mt-2 font-bold leading-snug text-slate-900 dark:text-white ${compact ? 'text-base line-clamp-3' : 'text-lg line-clamp-3'}`}>
            {article.title}
          </h3>
          {!hideExcerpt && article.excerpt && (
            <p className="mt-2 text-sm leading-6 text-slate-600 line-clamp-3 dark:text-slate-400">{article.excerpt}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            {!hideAuthor && authorName && <span className="line-clamp-1">By {authorName}</span>}
            {article.published_at && (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}
