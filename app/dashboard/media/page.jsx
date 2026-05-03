'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Trash, Upload, Search, DownloadCloud, X, Loader2, Image as ImageIcon, Video, Music, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'

export default function MediaLibraryPage() {
  const [media, setMedia] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const fileInputRef = useRef(null)
  const { toast } = useToast()

  useEffect(() => {
    loadMedia()
  }, [filterType, page])

  const loadMedia = async () => {
    try {
      setLoading(true)
      const query = new URLSearchParams()
      if (filterType !== 'all') query.append('type', filterType)
      query.append('page', String(page))
      query.append('limit', '24')

      const response = await fetch(`/api/media?${query}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()
      if (data.status === 200) {
        setMedia(data.data.media || [])
        setPages(data.data.pagination?.pages || 1)
      } else {
        toast({ title: 'Error', description: 'Failed to load media', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Load media error:', error)
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file) => {
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      // Add image dimensions if available
      if (file.type.startsWith('image/')) {
        const dimensions = await new Promise((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve({ width: img.width, height: img.height })
          img.onerror = () => reject(new Error('Could not read image dimensions'))
          img.src = URL.createObjectURL(file)
        })
        formData.append('dimensions', JSON.stringify(dimensions))
      }

      const response = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.status === 201) {
        toast({ title: 'Success', description: 'File uploaded successfully' })
        loadMedia()
      } else {
        toast({
          title: 'Upload failed',
          description: data.error?.message || data.error || 'Unknown error',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handleInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFileUpload(file)
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (file) handleFileUpload(file)
  }

  const handleDelete = async (id) => {
    try {
      setDeleting(id)
      const response = await fetch(`/api/media?id=${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()
      if (data.status === 200) {
        toast({ title: 'Success', description: 'Media deleted successfully' })
        loadMedia()
      } else {
        toast({
          title: 'Delete failed',
          description: data.error?.message || data.error || 'Unknown error',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setDeleting(null)
    }
  }

  const filteredMedia = media.filter(item =>
    item.filename.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-10 w-10 text-gray-600" />
    if (type.startsWith('video/')) return <Video className="h-10 w-10 text-gray-600" />
    if (type.startsWith('audio/')) return <Music className="h-10 w-10 text-gray-600" />
    if (type.includes('pdf')) return <FileText className="h-10 w-10 text-gray-600" />
    return <FileText className="h-10 w-10 text-gray-600" />
  }


  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Media Library</h1>
        <p className="text-gray-600 mt-2">Manage your uploaded media files with drag-drop support</p>
      </div>

      {/* Drag-drop upload area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 mb-6 transition-colors ${dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }`}
      >
        <div className="text-center">
          <DownloadCloud className="mx-auto h-12 w-12 text-gray-400 mb-2" />
          <p className="text-sm font-medium text-gray-700">
            Drag and drop your files here
          </p>
          <p className="text-xs text-gray-500">or</p>
          <Button
            asChild
            variant="outline"
            disabled={uploading}
            className="mt-2"
          >
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? 'Uploading...' : 'Browse Files'}
            </label>
          </Button>
          <Input
            ref={fileInputRef}
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleInputChange}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
            disabled={uploading}
          />
          <p className="text-xs text-gray-500 mt-2">
            Max 50MB - Images, videos, audio, or documents
          </p>
        </div>
      </div>

      {/* Filters and search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            placeholder="Search by filename..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            onClick={() => { setFilterType('all'); setPage(1) }}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={filterType === 'image' ? 'default' : 'outline'}
            onClick={() => { setFilterType('image'); setPage(1) }}
            size="sm"
          >
            Images
          </Button>
          <Button
            variant={filterType === 'video' ? 'default' : 'outline'}
            onClick={() => { setFilterType('video'); setPage(1) }}
            size="sm"
          >
            Videos
          </Button>
          <Button
            variant={filterType === 'audio' ? 'default' : 'outline'}
            onClick={() => { setFilterType('audio'); setPage(1) }}
            size="sm"
          >
            Audio
          </Button>
          <Button
            variant={filterType === 'document' ? 'default' : 'outline'}
            onClick={() => { setFilterType('document'); setPage(1) }}
            size="sm"
          >
            Documents
          </Button>
        </div>
      </div>

      {/* Media grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>{searchTerm ? 'No media files match your search' : 'No media files yet. Upload your first file!'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedia.map((item) => (
            <Card key={item.id} className="p-0 overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
              {/* Preview */}
              <div className="aspect-square bg-gray-100 overflow-hidden relative group">
                {item.file_type.startsWith('image/') ? (
                  <Image
                    src={item.file_url}
                    alt={item.filename}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 33vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                    {getFileIcon(item.file_type)}
                  </div>
                )}

                {/* Delete button overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deleting === item.id}
                      >
                        {deleting === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Trash className="h-4 w-4 mr-1" />
                            Delete
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogTitle>Delete Media</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{item.filename}"? This action cannot be undone.
                      </AlertDialogDescription>
                      <div className="flex justify-end gap-3">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(item.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Metadata */}
              <div className="p-3 flex-1 flex flex-col">
                <p className="text-sm font-medium truncate text-gray-900">{item.filename}</p>
                <p className="text-xs text-gray-500 mt-1">{formatFileSize(item.file_size)}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {item.created_at && formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </p>

                {/* Copy URL button */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-auto"
                  onClick={() => {
                    navigator.clipboard.writeText(item.file_url)
                    toast({ title: 'Copied', description: 'URL copied to clipboard' })
                  }}
                >
                  Copy URL
                </Button>
              </div>
            </Card>
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
