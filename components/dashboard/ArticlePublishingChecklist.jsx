import { CheckCircle2, FileText, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const REQUIRED_ITEMS = [
  'Title',
  'Excerpt',
  'Category',
  'Featured image uploaded in the media library',
  'Featured image alt text',
  'Main content/body',
  'SEO title',
  'SEO description',
]

const OPTIONAL_ITEMS = [
  'URL slug can be edited, but it is auto-generated from the title',
  'Canonical URL can stay blank unless you have a specific production canonical',
  'Structured data override is optional and only needed for custom schema',
  'Tags and keywords help discovery, but they are not required for review/publish',
]

export default function ArticlePublishingChecklist({ contentType = 'news', userRole = 'author' }) {
  const contentLabel = contentType === 'article' ? 'article' : 'news story'
  const actionLabel = userRole === 'admin' ? 'publish' : 'submit for review'

  return (
    <Card className="border-amber-200 bg-amber-50/70">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg text-amber-950">
          <FileText className="h-5 w-5" />
          Required Before Review Or Publish
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-amber-950">
        <p>
          Drafts can be saved with partial information. Before this {contentLabel} is ready to {actionLabel},
          complete every required item below so no important point is missed.
        </p>

        <div className="grid gap-2 md:grid-cols-2">
          {REQUIRED_ITEMS.map((item) => (
            <div key={item} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-white/70 px-3 py-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-amber-200 bg-white/70 px-3 py-3">
          <p className="flex items-center gap-2 font-medium">
            <Info className="h-4 w-4 text-amber-700" />
            Helpful notes
          </p>
          <div className="mt-2 space-y-1 text-sm text-amber-900">
            {OPTIONAL_ITEMS.map((item) => (
              <p key={item}>{item}</p>
            ))}
            <p>Use the image upload field for the featured image. Direct external image URLs may fail submission checks.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
