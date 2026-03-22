import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Calendar, Linkedin } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import Image from 'next/image'
import PublicHeader from '@/components/layout/PublicHeader'
import StructuredData from '@/components/seo/StructuredData'
import { absoluteUrl } from '@/lib/site-config'
import { getAnchorPropsForHref } from '@/lib/link-policy'

async function findAuthorBySlug(rawSlug) {
  const supabase = await createClient()
  const alternateSlug = rawSlug?.startsWith('@') ? rawSlug.slice(1) : `@${rawSlug}`
  const nameCandidate = rawSlug?.replace(/-/g, ' ')

  let { data: author } = await supabase
    .from('authors')
    .select('id, slug, name, bio, avatar_url, title, social_links')
    .or(`slug.eq.${rawSlug},slug.eq.${alternateSlug},id.eq.${rawSlug}`)
    .maybeSingle()

  if (!author && nameCandidate) {
    const { data: nameMatch } = await supabase
      .from('authors')
      .select('id, slug, name, bio, avatar_url, title, social_links')
      .ilike('name', `%${nameCandidate}%`)
      .limit(1)
      .maybeSingle()
    author = nameMatch
  }

  if (!author && rawSlug) {
    const { data: emailMatch } = await supabase
      .from('authors')
      .select('id, slug, name, bio, avatar_url, title, social_links')
      .ilike('email', `${rawSlug}@%`)
      .limit(1)
      .maybeSingle()
    author = emailMatch
  }

  return author || null
}

export async function generateMetadata({ params }) {
  const author = await findAuthorBySlug(params.slug)

  if (!author) {
    return { title: 'Author Not Found | EkahNews' }
  }

  const authorSlug = author.slug && !author.slug.startsWith('@') ? author.slug : author.id
  const canonical = absoluteUrl(`/authors/${authorSlug}`)
  const description = author.bio || `Read articles by ${author.name} on EkahNews.`

  return {
    title: `${author.name} | EkahNews`,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'profile',
      title: `${author.name} | EkahNews`,
      description,
      url: canonical,
      images: author.avatar_url ? [{ url: author.avatar_url }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${author.name} | EkahNews`,
      description,
      images: author.avatar_url ? [author.avatar_url] : [],
    },
  }
}

export default async function AuthorProfilePage({ params }) {
  const supabase = await createClient()
  const author = await findAuthorBySlug(params.slug)

  if (!author) {
    notFound()
  }

  const canonicalSlug = author.slug && !author.slug.startsWith('@') ? author.slug : author.id
  if (canonicalSlug && canonicalSlug !== params.slug) {
    redirect(`/authors/${canonicalSlug}`)
  }

  const [primaryArticlesResult, categoriesResult] = await Promise.all([
    supabase
      .from('articles')
      .select(`
        id,
        title,
        slug,
        excerpt,
        featured_image_url,
        published_at,
        categories (name, slug),
        authors (name)
      `)
      .eq('author_id', author.id)
      .eq('status', 'published')
      .order('published_at', { ascending: false }),
    supabase
      .from('categories')
      .select('id, name, slug')
      .order('name'),
  ])

  let articles = primaryArticlesResult.data || []

  if (articles.length === 0) {
    const { data: fallbackArticles } = await supabase
      .from('articles')
      .select(`
        id,
        title,
        slug,
        excerpt,
        featured_image_url,
        published_at,
        categories (name, slug),
        authors!inner (id, name, slug)
      `)
      .eq('status', 'published')
      .eq('authors.id', author.id)
      .order('published_at', { ascending: false })
    articles = fallbackArticles || articles
  }

  const categories = categoriesResult.data
  const authorCanonicalUrl = absoluteUrl(`/authors/${canonicalSlug}`)
  const profileSchema = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: `${author.name} profile`,
    url: authorCanonicalUrl,
    mainEntity: {
      '@type': 'Person',
      name: author.name,
      description: author.bio || undefined,
      image: author.avatar_url || undefined,
      jobTitle: author.title || undefined,
      url: authorCanonicalUrl,
      sameAs: [
        author.social_links?.twitter,
        author.social_links?.linkedin,
        author.social_links?.website,
      ].filter(Boolean),
    },
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StructuredData data={profileSchema} />
      <PublicHeader categories={categories || []} />
      <div className="w-full max-w-6xl mx-auto px-4 py-12">
        <Card className="mb-8 dark:bg-gray-800 dark:border-gray-700">
          <CardHeader className="text-center py-12">
            <div className="flex flex-col items-center">
              <Avatar className="h-32 w-32 mb-4" suppressHydrationWarning>
                <AvatarImage src={author.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {author.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <h1 className="text-4xl font-bold mb-2 dark:text-white">{author.name}</h1>
              {author.title && (
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">{author.title}</p>
              )}
              {author.bio && (
                <p className="text-gray-700 dark:text-gray-300 max-w-2xl text-center mb-4">
                  {author.bio}
                </p>
              )}
              {author.social_links?.linkedin && (
                <div className="flex gap-4 mt-4">
                  <a
                    href={author.social_links.linkedin}
                    {...getAnchorPropsForHref(author.social_links.linkedin)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#0A66C2] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    aria-label={`${author.name} LinkedIn profile`}
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </a>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        <div>
          <h2 className="text-3xl font-bold mb-6 dark:text-white">
            Articles by {author.name}
          </h2>

          {articles?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {articles.map((article) => (
                <Link
                  key={article.id}
                  href={`/${article.categories?.slug || 'news'}/${article.slug}`}
                >
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full dark:bg-gray-800 dark:border-gray-700">
                    {article.featured_image_url && (
                      <div className="relative w-full aspect-video overflow-hidden rounded-t-lg">
                        <Image
                          src={article.featured_image_url}
                          alt={article.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      </div>
                    )}
                    <CardContent className="p-4">
                      {article.categories && (
                        <Badge variant="secondary" className="mb-2">
                          {article.categories.name}
                        </Badge>
                      )}
                      <h3 className="font-bold text-lg mb-2 line-clamp-2 dark:text-white">
                        {article.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                        {article.excerpt}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <time>{format(new Date(article.published_at), 'MMM d, yyyy')}</time>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center dark:bg-gray-800 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400">
                No published articles yet from this author
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
