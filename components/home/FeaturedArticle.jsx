import Link from 'next/link'
import { ArticleImage, ArticleMeta, getEditorialArticleHref } from '@/components/home/editorialUtils'

export default function FeaturedArticle({ article }) {
  if (!article) return null

  return (
    <article className="space-y-3">
      <ArticleImage
        article={article}
        className="aspect-[16/8.5] border border-[var(--c-border)] dark:border-slate-800"
        sizes="(max-width: 1023px) 100vw, 560px"
        priority
      />
      <Link href={getEditorialArticleHref(article)} className="block">
        <h3 className="font-title text-[24px] font-bold leading-tight tracking-[-0.01em] text-[var(--c-heading)] hover:underline dark:text-white">
          {article.title}
        </h3>
      </Link>
      <ArticleMeta article={article} compact />
      {article.excerpt ? (
        <p className="font-body text-[12.5px] font-medium leading-[1.6] text-[var(--c-muted)] line-clamp-3 dark:text-slate-400">
          {article.excerpt}
        </p>
      ) : null}
    </article>
  )
}
