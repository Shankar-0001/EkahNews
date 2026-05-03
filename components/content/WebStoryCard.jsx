import Image from 'next/image'
import { formatArticleCardDate } from '@/lib/date-utils'

export default function WebStoryCard({ story }) {
  return (
    <a href={`/web-stories/${story.slug}`} className="block h-full">
      <div className="h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
          {story.cover_image && (
            <Image
              src={story.cover_image}
              alt={story.cover_image_alt || story.title || 'Web story cover'}
              fill
              className="object-cover transition-transform duration-500 hover:scale-[1.03]"
              sizes="(max-width: 768px) 60vw, 255px"
            />
          )}
        </div>
        <div className="border-t border-slate-200 p-3 dark:border-slate-800">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 md:text-[15px] dark:text-white">
            {story.title}
          </h3>
          {story.published_at && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {formatArticleCardDate(story.published_at)}
            </p>
          )}
        </div>
      </div>
    </a>
  )
}
