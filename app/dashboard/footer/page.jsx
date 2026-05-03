'use client'

import { useEffect, useMemo, useState } from 'react'
import TipTapEditor from '@/components/editor/TipTapEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import {
  validateImageFile,
  compressImage,
  generateStoragePath,
  formatFileSize,
  getImageDimensions,
} from '@/lib/image-utils'

export default function FooterPagesEditor() {
  const supabase = createClient()
  const { toast } = useToast()
  const [pages, setPages] = useState([])
  const [selectedSlug, setSelectedSlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('')

  const [title, setTitle] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [content, setContent] = useState({ html: '', json: null })

  const sections = useMemo(() => {
    const grouped = pages.reduce((acc, page) => {
      const section = page.section || 'Pages'
      acc[section] = acc[section] || []
      acc[section].push(page)
      return acc
    }, {})

    return Object.entries(grouped).map(([section, items]) => ({
      section,
      items,
    }))
  }, [pages])

  useEffect(() => {
    loadPages()
  }, [])

  useEffect(() => {
    const current = pages.find((page) => page.slug === selectedSlug)
    if (!current) return
    setTitle(current.title || '')
    setSeoTitle(current.seo_title || '')
    setSeoDescription(current.seo_description || '')
    setContent({
      html: current.content_html || '',
      json: current.content_json || null,
    })
  }, [pages, selectedSlug])

  useEffect(() => {
    setSaveSuccessMessage('')
  }, [selectedSlug])

  const loadPages = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/static-pages')
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || 'Failed to load pages')
      const pagesData = result?.data?.pages || []
      setPages(pagesData)
      if (!selectedSlug) {
        const firstEditable = pagesData.find((page) => page.editable !== false)
        setSelectedSlug(firstEditable?.slug || pagesData[0]?.slug || '')
      }
    } catch (err) {
      console.error('Load static pages error:', err)
      setError(err.message || 'Failed to load static pages')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (file) => {
    return new Promise(async (resolve) => {
      if (!file) {
        resolve(null)
        return
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        const validation = validateImageFile(file)
        if (!validation.valid) {
          toast({
            variant: 'destructive',
            title: 'Invalid file',
            description: validation.errors.join(', '),
          })
          resolve(null)
          return
        }

        const dimensions = await getImageDimensions(file)
        if (dimensions.width < 1200 || dimensions.height < 630) {
          toast({
            title: 'Warning',
            description: `Image is ${dimensions.width}x${dimensions.height}. For best quality, use at least 1200x630px.`,
          })
        }

        const compressedFile = await compressImage(file, 1920, 1920)
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = generateStoragePath('pages', fileName)

        const { error } = await supabase.storage
          .from('media')
          .upload(filePath, compressedFile)

        if (error) {
          toast({
            variant: 'destructive',
            title: 'Upload failed',
            description: error.message,
          })
          resolve(null)
          return
        }

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(filePath)

        if (user?.id) {
          const { error: insertError } = await supabase.from('media_library').insert({
            filename: file.name,
            file_url: publicUrl,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
            original_width: dimensions.width,
            original_height: dimensions.height,
            uploaded_by: user.id,
          })

          if (insertError) {
            await supabase.storage.from('media').remove([filePath]).catch(() => {})
            throw new Error(insertError.message || 'Failed to save media library metadata')
          }
        }

        toast({
          title: 'Image uploaded',
          description: `Uploaded ${formatFileSize(compressedFile.size)}`,
        })

        resolve(publicUrl)
      } catch (err) {
        console.error('Image upload error:', err)
        toast({
          variant: 'destructive',
          title: 'Upload error',
          description: err.message || 'Failed to upload image',
        })
        resolve(null)
      }
    })
  }

  const handleSave = async () => {
    if (!selectedSlug) return
    if (!content.html || content.html.trim().length === 0) {
      toast({
        variant: 'destructive',
        title: 'Validation error',
        description: 'Page content cannot be empty',
      })
      return
    }

    try {
      setSaving(true)
      setSaveSuccessMessage('')
      const resolvedTitle = title.trim() || currentPage?.title || currentPage?.label || 'Page'
      const resolvedSeoTitle = seoTitle.trim() || currentPage?.seo_title || resolvedTitle
      const resolvedSeoDescription = seoDescription.trim() || currentPage?.seo_description || ''
      const response = await fetch('/api/static-pages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: selectedSlug,
          title: resolvedTitle,
          seo_title: resolvedSeoTitle,
          seo_description: resolvedSeoDescription,
          content_html: content.html,
          content_json: content.json,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || 'Failed to update page')

      await loadPages()
      setSaveSuccessMessage('Updated successfully')

      toast({
        title: 'Saved',
        description: 'Page content updated successfully.',
      })
    } catch (err) {
      console.error('Save static page error:', err)
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: err.message || 'Failed to update page',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!selectedSlug) return
    try {
      setSaving(true)
      const response = await fetch('/api/static-pages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: selectedSlug }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || 'Failed to reset page')

      toast({
        title: 'Reset',
        description: 'Page reverted to default content.',
      })
      loadPages()
    } catch (err) {
      console.error('Reset static page error:', err)
      toast({
        variant: 'destructive',
        title: 'Reset failed',
        description: err.message || 'Failed to reset page',
      })
    } finally {
      setSaving(false)
    }
  }

  const currentPage = pages.find((page) => page.slug === selectedSlug)
  const isEditable = currentPage?.editable !== false

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Loading footer pages...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Footer Pages</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Edit the content behind footer links while keeping SEO metadata consistent.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Footer Menu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sections.map((section) => (
              <div key={section.section}>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  {section.section}
                </div>
                <div className="space-y-1">
                  {section.items.map((page) => (
                    <button
                      key={page.slug}
                      type="button"
                      onClick={() => setSelectedSlug(page.slug)}
                      className={`w-full text-left px-3 py-2 rounded-md border transition ${
                        page.slug === selectedSlug
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-transparent hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{page.label}</span>
                        {page.editable === false && (
                          <Badge variant="outline" className="text-[10px]">Auto</Badge>
                        )}
                        {page.hasOverride && page.editable !== false && (
                          <Badge variant="secondary" className="text-[10px]">Edited</Badge>
                        )}
                      </div>
                      {page.editable === false && page.href && (
                        <span className="text-xs text-muted-foreground">{page.href}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {!currentPage && (
            <Alert>
              <AlertDescription>Select a page to edit.</AlertDescription>
            </Alert>
          )}

          {currentPage && currentPage.editable === false && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{currentPage.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This item is auto-generated for SEO and is not editable. It currently points to{' '}
                  <span className="font-mono">{currentPage.href}</span>.
                </p>
              </CardContent>
            </Card>
          )}

          {currentPage && isEditable && (
            <>
              <Card>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 pt-6">
                    <Badge variant={currentPage.hasOverride ? 'secondary' : 'outline'}>
                      {currentPage.hasOverride ? 'Edited' : 'Default content'}
                    </Badge>
                    {currentPage.updated_at && (
                      <span className="text-xs text-gray-500">
                        Last updated: {new Date(currentPage.updated_at).toLocaleString()}
                      </span>
                    )}
                    {saveSuccessMessage && (
                      <span className="text-xs font-medium text-emerald-600">{saveSuccessMessage}</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Page Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <TipTapEditor
                    key={selectedSlug}
                    content={content.html}
                    onChange={setContent}
                    onImageUpload={handleImageUpload}
                  />
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={saving || !currentPage.hasOverride}
                >
                  Reset to Default
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
