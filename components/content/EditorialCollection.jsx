import Link from 'next/link'
import { notFound } from 'next/navigation'
import PublicHeader from '@/components/layout/PublicHeader'
import ArticleMiniCard from '@/components/content/ArticleMiniCard'
import WebStoryCard from '@/components/content/WebStoryCard'
import { readCollection, collectionPage } from '@/lib/editorial-collections'

export default async function EditorialCollection({descriptor,path,searchParams={}}) {
  if (!descriptor) notFound()
  const page = collectionPage(searchParams.page)
  if (!page) notFound()
  const result = await readCollection(descriptor,page)
  if (page > 1 && !result.items.length) notFound()
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
    <PublicHeader/>
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <nav aria-label="Breadcrumb"><Link href="/">Home</Link> / <span>{descriptor.title}</span></nav>
      <h1 className="text-3xl font-bold">{descriptor.title}</h1>
      {descriptor.description && <p className="text-slate-600 dark:text-slate-300">{descriptor.description}</p>}
      {!result.items.length && <p>No published content is available here yet.</p>}
      <div data-content-kind={descriptor.content_kind} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map(item=>result.stories ? <WebStoryCard key={item.id} story={item}/> : <div key={item.id}>
          {item.article_sponsorships && <p className="mb-2 text-sm">Sponsored ? {item.article_sponsorships.sponsor_name} ? {item.article_sponsorships.disclosure}</p>}
          <ArticleMiniCard article={item}/>
        </div>)}
      </div>
      <nav aria-label="Pagination" className="flex gap-6">
        {page > 1 && <Link rel="prev" href={page===2 ? path : path+'?page='+(page-1)}>Previous</Link>}
        {page*18 < result.count && <Link rel="next" href={path+'?page='+(page+1)}>Next</Link>}
      </nav>
    </main>
  </div>
}
