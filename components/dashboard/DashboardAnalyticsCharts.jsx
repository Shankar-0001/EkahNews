'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

function truncate(text = '', size = 24) {
  if (!text) return ''
  return text.length > size ? `${text.slice(0, size - 3)}...` : text
}

const articleChartConfig = {
  value: { label: 'Count', color: 'hsl(var(--chart-1))' },
}

export default function DashboardAnalyticsCharts({ articles = [] }) {
  const [selectedArticleId, setSelectedArticleId] = useState(articles?.[0]?.id || '')

  const selectedArticle = useMemo(
    () => (articles || []).find((item) => item.id === selectedArticleId) || articles?.[0] || null,
    [articles, selectedArticleId]
  )

  const articleMetricsData = useMemo(() => {
    if (!selectedArticle) return []
    return [
      { metric: 'Views', value: selectedArticle.views || 0 },
      { metric: 'Likes', value: selectedArticle.likes || 0 },
      { metric: 'Shares', value: selectedArticle.shares || 0 },
      { metric: 'Score', value: selectedArticle.score || 0 },
    ]
  }, [selectedArticle])

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Article Performance Graph</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {articles.length > 0 ? (
            <>
              <label className="text-sm text-gray-600 dark:text-gray-400 block">
                Select Article
                <select
                  className="mt-2 w-full rounded-md border bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  value={selectedArticle?.id || ''}
                  onChange={(e) => setSelectedArticleId(e.target.value)}
                >
                  {articles.map((article) => (
                    <option key={article.id} value={article.id}>
                      {truncate(article.title, 80)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">Views: {selectedArticle?.views || 0}</Badge>
                <Badge variant="outline">Likes: {selectedArticle?.likes || 0}</Badge>
                <Badge variant="outline">Shares: {selectedArticle?.shares || 0}</Badge>
                <Badge variant="secondary">Engagement Score: {selectedArticle?.score || 0}</Badge>
              </div>

              <ChartContainer config={articleChartConfig} className="h-[280px] w-full">
                <BarChart data={articleMetricsData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="metric" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="var(--color-value)" />
                </BarChart>
              </ChartContainer>
            </>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No article data available yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
