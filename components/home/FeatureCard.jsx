import Link from 'next/link'
import { ArticleImage, getEditorialArticleHref } from '@/components/home/editorialUtils'

export default function FeatureCard({ article }) {
  if (!article) return null

  return (
    <article>
      <Link href={getEditorialArticleHref(article)} className="block">
        <ArticleImage
          article={article}
          className="aspect-[16/10]"
          sizes="(max-width: 767px) 100vw, 160px"
        />
        <h3 className="mt-2 font-title text-[14px] font-semibold leading-snug text-[var(--c-heading)] line-clamp-3 hover:underline dark:text-white">
          {article.title}
        </h3>
        {article.excerpt ? (
          <p className="mt-2 font-body text-[12.5px] font-medium leading-[1.6] text-[var(--c-muted)] line-clamp-3 dark:text-slate-400">
            {article.excerpt}
          </p>
        ) : null}
      </Link>
    </article>
  )
}
