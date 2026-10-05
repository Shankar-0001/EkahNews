import Link from 'next/link'
import { ArticleImage, getEditorialArticleHref } from '@/components/home/editorialUtils'

export default function SecondaryArticle({ article }) {
  if (!article) return null

  return (
    <article className="space-y-2">
      <Link href={getEditorialArticleHref(article)} className="block">
        <ArticleImage
          article={article}
          className="h-[84px] w-full border border-[var(--c-border)] dark:border-slate-800"
          sizes="146px"
        />
      </Link>
      <Link
        href={getEditorialArticleHref(article)}
        className="block font-title text-[14px] font-semibold leading-snug text-[var(--c-heading)] hover:underline dark:text-white"
      >
        {article.title}
      </Link>
    </article>
  )
}
