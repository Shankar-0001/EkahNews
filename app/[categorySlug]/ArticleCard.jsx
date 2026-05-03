import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, User } from 'lucide-react'
import Image from 'next/image'
import { formatArticleCardDate } from '@/lib/date-utils'

export default function ArticleCard({ article }) {
    return (
        <Link href={`/${article.categories?.slug}/${article.slug}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full dark:bg-gray-800 dark:border-gray-700">
                <div className="flex flex-col md:flex-row">
                    {article.featured_image_url && (
                        <div className="relative w-full md:w-64 h-48 md:h-auto">
                            <Image
                                src={article.featured_image_url}
                                alt={article.title}
                                fill
                                className="object-cover rounded-t-lg md:rounded-l-lg md:rounded-t-none"
                                sizes="(max-width: 768px) 100vw, 256px"
                            />
                        </div>
                    )}
                    <CardContent className="flex-1 p-6">
                        <div className="flex items-center gap-2 mb-3">
                            {article.categories && (
                                <Badge variant="secondary" className="dark:bg-gray-700">
                                    {article.categories.name}
                                </Badge>
                            )}
                        </div>
                        <h3 className="text-xl font-bold mb-2 dark:text-white">
                            {article.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                            {article.excerpt}
                        </p>
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>{article.authors?.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>
                                    {formatArticleCardDate(article.published_at)}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </div>
            </Card>
        </Link>
    )
}
