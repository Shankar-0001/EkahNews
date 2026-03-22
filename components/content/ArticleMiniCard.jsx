import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

export default function ArticleMiniCard({ article, compact = false, hideAuthor = false, hideExcerpt = false, imagePriority = false }) {
  const href = `/${article.categories?.slug || 'news'}/${article.slug}`
  const authorName = article.authors?.name

  return (
    <Link href={href} className="block h-full">
      <Card className="h-full overflow-hidden rounded-[20px] shadow-sm hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
        {article.featured_image_url && (
          <div className={`relative w-full ${compact ? 'aspect-[4/3]' : 'aspect-[16/10]'}`}>
            <Image
              src={article.featured_image_url}
              alt={article.title || 'Article image'}
              fill
              className="object-cover transition-transform duration-500 hover:scale-[1.03]"
              sizes={compact ? '(max-width: 768px) 100vw, 33vw' : '(max-width: 1024px) 100vw, 25vw'}
              priority={imagePriority}
              loading={imagePriority ? 'eager' : undefined}
            />
          </div>
        )}
        <div className="p-4 md:p-5">
          {article.categories?.name && (
            <Badge variant="secondary" className="mb-2">{article.categories.name}</Badge>
          )}
          <h3 className={`font-bold leading-snug text-gray-900 dark:text-white ${compact ? 'text-base line-clamp-3' : 'text-lg line-clamp-3'}`}>
            {article.title}
          </h3>
          {!hideExcerpt && article.excerpt && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{article.excerpt}</p>
          )}
          {!hideAuthor && authorName && (
            <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 line-clamp-1">
              By {authorName}
            </p>
          )}
          {article.published_at && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(new Date(article.published_at), { addSuffix: true })}
            </p>
          )}
        </div>
      </Card>
    </Link>
  )
}