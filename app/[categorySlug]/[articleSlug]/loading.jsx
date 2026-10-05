export default function ArticleLoading() {
  return <main aria-busy="true" aria-label="Loading article" className="mx-auto min-h-screen min-h-[100svh] w-full max-w-6xl px-4 py-12">
    <p role="status" className="mb-6 text-muted-foreground">Loading article?</p>
    <div aria-hidden="true" className="animate-pulse space-y-5">
      <div className="h-10 w-3/4 rounded bg-muted" /><div className="h-5 w-1/2 rounded bg-muted" />
      <div className="aspect-video max-w-3xl rounded bg-muted" /><div className="h-5 w-full rounded bg-muted" />
    </div>
  </main>
}
