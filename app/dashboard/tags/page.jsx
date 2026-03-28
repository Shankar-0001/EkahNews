'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, X } from 'lucide-react'
import { createSlug } from '@/lib/slug'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'

export default function TagsPage() {
  const [tags, setTags] = useState([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    loadTags()
  }, [page])

  const loadTags = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tags?page=${page}&limit=30`)
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || 'Failed to load tags')
      setTags(result?.data?.tags || [])
      setPages(result?.data?.pagination?.pages || 1)
    } catch (error) {
      console.error('Load tags error:', error)
      setTags([])
      setPages(1)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!name) return

    const response = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        slug: createSlug(name),
      }),
    })
    const result = await response.json()
    if (!response.ok) {
      alert(result?.error || 'Failed to create tag')
      return
    }

    setShowDialog(false)
    setName('')
    loadTags()
  }

  const handleDelete = async (id) => {
    const response = await fetch('/api/tags', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const result = await response.json()
    if (!response.ok) {
      alert(result?.error || 'Failed to delete tag')
      return
    }
    loadTags()
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tags</h1>
          <p className="text-gray-600 mt-2">Manage content tags</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Tag</DialogTitle>
              <DialogDescription className="sr-only">Create a reusable tag to classify related articles.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tag name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate}>Create Tag</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading tags...</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="text-base px-4 py-2">
              {tag.name}
              <button
                onClick={() => handleDelete(tag.id)}
                className="ml-2 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="mt-6 flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Prev
          </Button>
          <span className="text-sm text-gray-500">Page {page} of {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}



