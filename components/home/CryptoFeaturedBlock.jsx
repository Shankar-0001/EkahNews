import Link from 'next/link'
import { ArticleImage, ArticleMeta, getEditorialArticleHref } from '@/components/home/editorialUtils'
import RelatedArticleLink from '@/components/home/RelatedArticleLink'

export default function CryptoFeaturedBlock({ article, relatedArticles = [] }) {
  if (!article) return null

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.44fr)_minmax(0,0.56fr)] lg:items-center">
        <article className="space-y-3 self-center">
          <Link
            href={getEditorialArticleHref(article)}
            className="block font-title text-[19px] font-bold leading-snug text-[var(--c-heading)] hover:underline dark:text-white"
          >
            {article.title}
          </Link>
          <ArticleMeta article={article} compact />
          {article.excerpt ? (
            <p className="font-body text-[12.5px] font-medium leading-[1.6] text-[var(--c-muted)] line-clamp-4 dark:text-slate-400">
              {article.excerpt}
            </p>
          ) : null}
        </article>

        <Link href={getEditorialArticleHref(article)} className="block">
          <ArticleImage
            article={article}
            className="aspect-[16/10]"
            sizes="(max-width: 1023px) 100vw, 480px"
          />
        </Link>
      </div>

      {relatedArticles.length > 0 ? (
        <div className="grid gap-5 border-t border-[var(--c-border)] pt-5 md:grid-cols-2 dark:border-slate-800">
          {relatedArticles.map((relatedArticle) => (
            <RelatedArticleLink key={relatedArticle.id} article={relatedArticle} />
          ))}
        </div>
      ) : null}
    </div>
  )
}
