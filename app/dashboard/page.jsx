import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, FolderOpen, Tag, Users, ArrowRight, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import DashboardAnalyticsCharts from '@/components/dashboard/DashboardAnalyticsCharts'

export const revalidate = 0

export const metadata = {
  title: 'Dashboard - EkahNews',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  // Get counts
  const { count: articlesCount } = await supabase
    .from('articles')
    .select('*', { count: 'exact', head: true })

  const { count: categoriesCount } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })

  const { count: tagsCount } = await supabase
    .from('tags')
    .select('*', { count: 'exact', head: true })

  const { count: authorsCount } = await supabase
    .from('authors')
    .select('*', { count: 'exact', head: true })

  const { data: articlesForAnalytics } = await supabase
    .from('articles')
    .select('id, title, slug, status, published_at')
    .order('published_at', { ascending: false })
    .limit(5)

  const articleIds = (articlesForAnalytics || []).map((article) => article.id).filter(Boolean)
  let engagementRows = []

  if (articleIds.length > 0) {
    const { data } = await supabase
      .from('article_engagement')
      .select('article_id, views, likes, shares')
      .in('article_id', articleIds)
    engagementRows = data || []
  }
  const engagementMap = new Map((engagementRows || []).map((row) => [
    row.article_id,
    {       
      views: row.views || 0,
      likes: row.likes || 0,
      shares: row.shares || 0,
    },
  ]))

  const articleAnalytics = (articlesForAnalytics || []).map((article) => {
    const metrics = engagementMap.get(article.id) || { views: 0, likes: 0, shares: 0 }
    const score = (metrics.views || 0) + (metrics.likes || 0) * 3 + (metrics.shares || 0) * 5
    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      status: article.status,
      published_at: article.published_at,
      views: metrics.views,
      likes: metrics.likes,
      shares: metrics.shares,
      score,
    }
  })

  // Get recent articles
  const { data: recentArticles } = await supabase
    .from('articles')
    .select('id, title, status, created_at, authors(name)')
    .order('created_at', { ascending: false })
    .limit(5)

  const stats = [
    {
      title: 'Total Articles',
      value: articlesCount || 0,
      icon: FileText,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      href: '/dashboard/articles',
    },
    {
      title: 'Categories',
      value: categoriesCount || 0,
      icon: FolderOpen,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950',
      href: '/dashboard/categories',
    },
    {
      title: 'Tags',
      value: tagsCount || 0,
      icon: Tag,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      href: '/dashboard/tags',
    },
    ...(userData?.role === 'admin' ? [{
      title: 'Authors',
      value: authorsCount || 0,
      icon: Users,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      href: '/dashboard/authors',
    }] : [])
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
      case 'archived':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome back!</h1>
        <p className="text-muted-foreground mt-2">
          Here's an overview of your content management dashboard
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <DashboardAnalyticsCharts
        articles={articleAnalytics}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Articles */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Articles</CardTitle>
              <Link href="/dashboard/articles">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentArticles && recentArticles.length > 0 ? (
                <div className="space-y-4">
                  {recentArticles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/dashboard/articles/${article.id}/edit`}
                      className="flex items-start justify-between p-3 rounded-lg hover:bg-muted transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate group-hover:text-primary">
                          {article.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {article.authors?.name} - {formatDistanceToNow(new Date(article.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge className={`ml-2 ${getStatusColor(article.status)} capitalize text-xs`}>
                        {article.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No articles yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/dashboard/articles/new" className="block">
                <Button className="w-full justify-start">
                  <Plus className="mr-2 h-4 w-4" />
                  New Content
                </Button>
              </Link>
              <Link href="/dashboard/articles" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  All Articles
                </Button>
              </Link>
              <Link href="/dashboard/media" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Tag className="mr-2 h-4 w-4" />
                  Media Library
                </Button>
              </Link>
              {userData?.role === 'admin' && (
                <>
                  <Link href="/dashboard/categories" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Categories
                    </Button>
                  </Link>
                  <Link href="/dashboard/authors" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Users className="mr-2 h-4 w-4" />
                      Authors
                    </Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

