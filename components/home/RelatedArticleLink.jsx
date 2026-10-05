import Link from 'next/link'
import { getEditorialArticleHref } from '@/components/home/editorialUtils'

export default function RelatedArticleLink({ article }) {
  if (!article) return null

  return (
    <article>
      <Link
        href={getEditorialArticleHref(article)}
        className="block font-title text-[13px] font-semibold leading-snug text-[var(--c-heading)] hover:underline dark:text-white"
      >
        {article.title}
      </Link>
    </article>
  )
}
