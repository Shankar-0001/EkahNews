import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format } from 'date-fns'
import Link from 'next/link'
import Image from 'next/image'
import ArticleSummaryToggles from '@/components/article/ArticleSummaryToggles'
import ArticleFollowStrip from '@/components/article/ArticleFollowStrip'
import SafeHtml from '@/components/SafeHtml'
import { calculateReadingTime, generateSixtySecondSummary } from '@/lib/content-utils'
import { SITE_URL, slugFromText } from '@/lib/site-config'

export default function InlineArticleRenderer({ article }) {
  if (!article) return null

  const categorySlug = article.categorySlug || article.categories?.slug || article.category_slug || 'news'
  const articlePath = `/${categorySlug}/${article.slug}`
  const articleUrl = `${SITE_URL}${articlePath}`
  const authorLinkSlug = article.authors?.slug
    || article.authors?.id
    || article.author_id
    || slugFromText(article.authors?.name || '')
  const readingTimeMinutes = calculateReadingTime(article.content || '')
  const summaryPoints = generateSixtySecondSummary(article)

  return (
    <article
      data-article-url={articlePath}
      data-article-title={article.title}
      data-article-slug={article.slug}
      data-article-category={categorySlug}
    >
      <header>
        <div className="w-full my-16">
          <div className="flex flex-wrap items-center gap-3">
            {article.categories && (
              <Link href={`/category/${categorySlug}`}>
                <Badge className="border-0 bg-[#d62828] px-3 py-1 text-white hover:bg-[#b61f1f]">
                  {article.categories.name}
                </Badge>
              </Link>
            )}
            <Badge variant="secondary" className="px-3 py-1">
              {readingTimeMinutes} min read
            </Badge>
          </div>

          <h2 className="py-4 text-[34px] font-extrabold leading-[1.03] tracking-tight text-slate-900 dark:text-white md:text-[34px]">
            {article.title}
          </h2>

          {article.excerpt && (
            <p className="py-1 text-lg leading-8 text-slate-700 dark:text-slate-300">
              {article.excerpt}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3 p-0 text-sm text-slate-600 dark:text-slate-400 md:gap-4 mb-4">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:min-w-[220px]">
              <Avatar className="h-11 w-11">
                <AvatarImage src={article.authors?.avatar_url || ''} />
                <AvatarFallback>
                  {(article.authors?.name || '').split(' ').map((name) => name[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <Link href={`/authors/${authorLinkSlug}`} className="font-semibold text-slate-900 hover:text-[#d62828] hover:underline dark:text-white dark:hover:text-red-400">
                  {article.authors?.name || 'EkahNews'}
                </Link>
                <div className="mt-0.5 flex flex-col gap-0.5 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                  {article.published_at && (
                    <div>
                      <time dateTime={article.published_at}>
                        Published {format(new Date(article.published_at), 'MMMM d, yyyy • h:mm a')}
                      </time>
                    </div>
                  )}
                  {article.updated_at && article.updated_at !== article.published_at && (
                    <div>
                      <time dateTime={article.updated_at}>
                        Updated {format(new Date(article.updated_at), 'MMMM d, yyyy • h:mm a')}
                      </time>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <ArticleFollowStrip articleUrl={articleUrl} articleTitle={article.title} />
          </div>
        </div>
      </header>

      {article.featured_image_url && (
        <figure className="mb-10 overflow-hidden border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
            <Image
              src={article.featured_image_url}
              alt={article.featured_image_alt || article.title}
              fill
              className="object-cover"
              sizes="(max-width: 1280px) 100vw, 1200px"
            />
          </div>
        </figure>
      )}

      <div className="space-y-8">
        <div>
          <div className="w-full">
            <ArticleSummaryToggles
              summaryPoints={summaryPoints}
            />

            <SafeHtml
              html={article.content || ''}
              baseUrl={SITE_URL}
              className="article-content prose w-full max-w-none ml-0 mr-0 text-left prose-slate prose-headings:font-bold prose-headings:text-slate-900 prose-headings:leading-snug prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-2 prose-h3:text-lg prose-h3:mt-5 prose-h3:mb-2 prose-p:text-base prose-p:leading-7 prose-p:text-slate-800 prose-p:my-3 prose-a:text-blue-600 prose-a:no-underline prose-a:hover:underline prose-strong:text-slate-900 prose-img:rounded-none prose-img:my-4 prose-blockquote:border-l-2 prose-blockquote:border-slate-300 prose-blockquote:text-slate-600 prose-blockquote:pl-4 prose-blockquote:my-4 dark:prose-invert"
            />

            {(article.article_tags || []).length > 0 && (
              <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
                <div className="flex flex-wrap gap-2">
                  {article.article_tags
                    .map((entry) => entry?.tags)
                    .filter(Boolean)
                    .map((tag) => (
                      <Link key={tag.id || tag.slug} href={`/tags/${tag.slug}`}>
                        <Badge variant="secondary" className="px-3 py-1 text-sm hover:bg-slate-200 dark:hover:bg-slate-800">
                          {tag.name}
                        </Badge>
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
