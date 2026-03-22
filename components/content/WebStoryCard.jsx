import Link from 'next/link'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'

export default function WebStoryCard({ story }) {
  return (
    <Link href={`/web-stories/${story.slug}`} className="block">
      <Card className="overflow-hidden rounded-[20px] hover:shadow-lg transition-shadow dark:bg-gray-800 dark:border-gray-700">
        <div className="relative aspect-[9/16] w-full bg-gray-100 dark:bg-gray-900">
          {story.cover_image && (
            <Image
              src={story.cover_image}
              alt={story.cover_image_alt || story.title || 'Web story cover'}
              fill
              className="object-cover transition-transform duration-500 hover:scale-[1.03]"
              sizes="(max-width: 768px) 50vw, 20vw"
            />
          )}
        </div>
        <div className="p-3 md:p-4">
          <h3 className="text-sm md:text-base font-semibold leading-snug line-clamp-3 dark:text-white">{story.title}</h3>
          {story.authors?.name && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">By {story.authors.name}</p>
          )}
          {story.published_at && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatDistanceToNow(new Date(story.published_at), { addSuffix: true })}</p>
          )}
        </div>
      </Card>
    </Link>
  )
}
