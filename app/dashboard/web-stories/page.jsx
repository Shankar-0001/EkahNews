'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Eye } from 'lucide-react'

function getStatusClasses(status = 'draft') {
  if (status === 'published') return 'bg-green-50 text-green-700 border-green-200'
  if (status === 'pending') return 'bg-blue-50 text-blue-700 border-blue-200'
  if (status === 'archived') return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-gray-50 text-gray-700 border-gray-200'
}

export default function DashboardWebStoriesPage() {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [storyToDelete, setStoryToDelete] = useState(null)
  const { toast } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/web-stories?page=${page}&limit=24`)
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || 'Failed to load stories')
      setStories(result?.data?.stories || [])
      setPages(result?.data?.pagination?.pages || 1)
    } catch (error) {
      toast({ variant: 'destructive', title: 'Load failed', description: error.message || 'Could not load web stories' })
      setStories([])
      setPages(1)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [page])

  const deleteStory = async () => {
    if (!storyToDelete) return

    try {
      const response = await fetch(`/api/web-stories/${storyToDelete.id}`, { method: 'DELETE' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.error || 'Failed to delete story')
      toast({ title: 'Story deleted', description: 'Web story deleted successfully.' })
      setStoryToDelete(null)
      load()
    } catch (error) {
      toast({ variant: 'destructive', title: 'Delete failed', description: error.message || 'Could not delete story' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Web Stories</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Published stories appear on the public site. Draft and pending stories stay in the dashboard until approved.
          </p>
        </div>
        <Link href="/dashboard/web-stories/new">
          <Button>Create Story</Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      ) : stories.length === 0 ? (
        <Card><CardContent className="p-6">No stories yet.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {stories.map((story) => (
            <Card key={story.id} className="dark:border-gray-700 dark:bg-gray-800">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-lg dark:text-white">{story.title}</CardTitle>
                  <Badge className={getStatusClasses(story.status)}>{story.status || 'draft'}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-gray-600 dark:text-gray-300">/web-stories/{story.slug}</p>
                <p className="text-gray-500 dark:text-gray-400">Author: {story.authors?.name || '-'}</p>
                <p className="text-gray-500 dark:text-gray-400">Category: {story.categories?.name || '-'}</p>
                <p className="text-gray-500 dark:text-gray-400">
                  Visibility: {story.status === 'published' ? 'Live on the public web stories pages' : 'Saved in dashboard only until published'}
                </p>
                {story.published_at && (
                  <p className="text-gray-500 dark:text-gray-400">Published: {new Date(story.published_at).toLocaleString()}</p>
                )}
                <div className="flex gap-2">
                  {story.status === 'published' ? (
                    <Link href={`/web-stories/${story.slug}`} target="_blank"><Button size="sm" variant="ghost"><Eye className="mr-1 h-4 w-4" />View</Button></Link>
                  ) : null}
                  <Link href={`/dashboard/web-stories/${story.id}/edit`}><Button size="sm" variant="outline">Edit</Button></Link>
                  <Button size="sm" variant="destructive" onClick={() => setStoryToDelete(story)}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Prev
          </Button>
          <span className="text-sm text-gray-500">Page {page} of {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
            Next
          </Button>
        </div>
      )}

      <AlertDialog open={!!storyToDelete} onOpenChange={(open) => !open && setStoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Web Story</AlertDialogTitle>
            <AlertDialogDescription>
              {storyToDelete ? `Delete "${storyToDelete.title}"? This action cannot be undone.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={deleteStory}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
