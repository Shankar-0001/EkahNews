import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, MoreVertical, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { ArticleActions } from '@/components/dashboard/ArticleActions'

export const revalidate = 0

export const metadata = {
  title: 'Articles - Dashboard',
}

export default async function ArticlesPage({ searchParams }) {
  const supabase = await createClient()
  const page = Math.max(1, Number.parseInt(searchParams?.page || '1', 10))
  const limit = 20
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data: { user } } = await supabase.auth.getUser()
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: articles, count, error } = await supabase
    .from('articles')
    .select(`
      *,
      authors (id, name, user_id),
      categories (name, slug)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  const isAdmin = userData?.role === 'admin'
  const total = count || 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'draft':
        return 'bg-gray-50 text-gray-700 border-gray-200'
      case 'archived':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200'
    }
  }

  const formatCreatedAt = (value) => {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return format(date, 'MMM d, yyyy h:mm a')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Articles</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {total} total articles
          </p>
        </div>
        <Link href="/dashboard/articles/new">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Content
          </Button>
        </Link>
      </div>

      {/* Articles Grid/List */}
      {articles && articles.length > 0 ? (
        <div className="grid gap-4">
          {articles.map((article) => {
            const canEdit = isAdmin || article.authors?.user_id === user.id

            return (
              <Card key={article.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <Link href={`/${article.categories?.slug || 'news'}/${article.slug}`} target="_blank">
                          <h2 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 truncate">
                            {article.title}
                          </h2>
                        </Link>
                        <Badge className={`${getStatusColor(article.status)} capitalize text-xs`}>
                          {article.status}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                        {article.excerpt || 'No excerpt provided'}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>By {article.authors?.name}</span>
                        {article.categories && (
                          <span className="flex items-center">
                            <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                            {article.categories.name}
                          </span>
                        )}
                        <span className="flex items-center">
                          <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                          {formatCreatedAt(article.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {canEdit && (
                      <div className="flex items-center gap-2">
                        <Link href={`/${article.categories?.slug || 'news'}/${article.slug}`} target="_blank">
                          <Button size="sm" variant="ghost" title="View published">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/dashboard/articles/${article.id}/edit`}>
                          <Button size="sm" variant="ghost" title="Edit article">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        {isAdmin && (
                          <ArticleActions articleId={article.id} />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No articles yet</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Get started by creating your first article
            </p>
            <Link href="/dashboard/articles/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Content
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/articles?page=${Math.max(1, page - 1)}`}>
            <Button variant="outline" size="sm" disabled={page <= 1}>
              Prev
            </Button>
          </Link>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <Link href={`/dashboard/articles?page=${Math.min(totalPages, page + 1)}`}>
            <Button variant="outline" size="sm" disabled={page >= totalPages}>
              Next
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
