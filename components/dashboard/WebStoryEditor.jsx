'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugFromText } from '@/lib/site-config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import KeywordInput from '@/components/dashboard/KeywordInput'
import { useToast } from '@/hooks/use-toast'

function emptyContentSlide() {
  return {
    image: '',
    image_alt: '',
    description: '',
  }
}

function emptyCtaSlide() {
  return {
    image: '',
    image_alt: '',
    description: '',
    cta_text: '',
    cta_url: '',
    whatsapp_group_url: '',
  }
}

function normalizeContentSlides(slides = []) {
  const regularSlides = (slides || []).filter((slide) => !slide?.cta_url && !slide?.whatsapp_group_url)
  return regularSlides.length > 0
    ? regularSlides.map((slide) => ({
      image: slide?.image || '',
      image_alt: slide?.image_alt || '',
      description: slide?.description || '',
    }))
    : [emptyContentSlide(), emptyContentSlide(), emptyContentSlide(), emptyContentSlide()]
}

function normalizeReadMoreSlide(slides = []) {
  const existing = (slides || []).find((slide) => slide?.cta_url || slide?.cta_text)
  return existing
    ? {
      image: existing?.image || '',
      image_alt: existing?.image_alt || '',
      description: existing?.description || '',
      cta_text: existing?.cta_text || '',
      cta_url: existing?.cta_url || '',
      whatsapp_group_url: '',
    }
    : emptyCtaSlide()
}

function normalizeWhatsappSlide(slides = []) {
  const existing = (slides || []).find((slide) => slide?.whatsapp_group_url)
  return existing
    ? {
      image: existing?.image || '',
      image_alt: existing?.image_alt || '',
      description: existing?.description || '',
      cta_text: '',
      cta_url: '',
      whatsapp_group_url: existing?.whatsapp_group_url || '',
    }
    : emptyCtaSlide()
}

function toDateTimeLocal(value) {
  if (!value) return ''
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 16)
}

export default function WebStoryEditor({ mode = 'create', storyId = null }) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [categories, setCategories] = useState([])
  const [authors, setAuthors] = useState([])
  const [userRole, setUserRole] = useState('author')

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [canonicalUrl, setCanonicalUrl] = useState('')
  const [structuredData, setStructuredData] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [coverImageAlt, setCoverImageAlt] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [authorId, setAuthorId] = useState('')
  const [relatedArticleSlug, setRelatedArticleSlug] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [keywords, setKeywords] = useState([])
  const [status, setStatus] = useState('draft')
  const [publishDate, setPublishDate] = useState('')
  const [updatedDate, setUpdatedDate] = useState('')
  const [adSlot, setAdSlot] = useState('')
  const [contentSlides, setContentSlides] = useState([emptyContentSlide(), emptyContentSlide(), emptyContentSlide(), emptyContentSlide()])
  const [readMoreSlide, setReadMoreSlide] = useState(emptyCtaSlide())
  const [whatsappSlide, setWhatsappSlide] = useState(emptyCtaSlide())

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser()
        if (!authData?.user) {
          router.push('/login')
          return
        }

        const [{ data: userRow }, { data: categoryRows }] = await Promise.all([
          supabase.from('users').select('role').eq('id', authData.user.id).single(),
          supabase.from('categories').select('id, name').order('name'),
        ])

        const nextRole = userRow?.role || 'author'
        setUserRole(nextRole)
        setCategories(categoryRows || [])

        if (nextRole === 'admin') {
          const { data: authorRows } = await supabase.from('authors').select('id, name').order('name')
          setAuthors(authorRows || [])
        } else {
          const { data: ownAuthor } = await supabase.from('authors').select('id, name').eq('user_id', authData.user.id).single()
          if (ownAuthor) {
            setAuthors([ownAuthor])
            setAuthorId(ownAuthor.id)
          }
        }

        if (mode === 'edit' && storyId) {
          const response = await fetch(`/api/web-stories/${storyId}`)
          const payload = await response.json()
          const story = payload?.data?.story
          if (!response.ok || !story) {
            throw new Error(payload?.error || 'Failed to load web story')
          }

          setTitle(story.title || '')
          setSlug(story.slug || '')
          setSeoTitle(story.seo_title || '')
          setSeoDescription(story.seo_description || '')
          setCanonicalUrl(story.canonical_url || '')
          setStructuredData(story.structured_data ? JSON.stringify(story.structured_data, null, 2) : '')
          setCoverImage(story.cover_image || '')
          setCoverImageAlt(story.cover_image_alt || '')
          setCategoryId(story.category_id || '')
          setAuthorId(story.author_id || '')
          setRelatedArticleSlug(story.related_article_slug || '')
          setTagsText(Array.isArray(story.tags) ? story.tags.join(', ') : '')
          setKeywords(Array.isArray(story.keywords) ? story.keywords : [])
          setStatus(story.status || 'draft')
          setPublishDate(toDateTimeLocal(story.published_at))
          setUpdatedDate(toDateTimeLocal(story.updated_at))
          setAdSlot(story.ad_slot || '')
          setContentSlides(normalizeContentSlides(story.slides))
          setReadMoreSlide(normalizeReadMoreSlide(story.slides))
          setWhatsappSlide(normalizeWhatsappSlide(story.slides))
        } else {
          setUpdatedDate(toDateTimeLocal(new Date().toISOString()))
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Could not load editor',
          description: error.message || 'Failed to initialize web story editor',
        })
      } finally {
        setBootstrapping(false)
      }
    }

    bootstrap()
  }, [mode, router, storyId, supabase, toast])

  const setContentSlide = (idx, patch) => {
    setContentSlides((prev) => prev.map((slide, index) => (index === idx ? { ...slide, ...patch } : slide)))
  }

  const addContentSlide = () => {
    setContentSlides((prev) => [...prev, emptyContentSlide()])
  }

  const removeContentSlide = (idx) => {
    setContentSlides((prev) => (prev.length <= 4 ? prev : prev.filter((_, index) => index !== idx)))
  }

  const moveContentSlide = (idx, dir) => {
    setContentSlides((prev) => {
      const nextIndex = idx + dir
      if (nextIndex < 0 || nextIndex >= prev.length) return prev
      const clone = [...prev]
      const temp = clone[idx]
      clone[idx] = clone[nextIndex]
      clone[nextIndex] = temp
      return clone
    })
  }

  const uploadMedia = async (file) => {
    if (!file) return ''
    const formData = new FormData()
    formData.append('file', file)

    if (file.type.startsWith('image/')) {
      try {
        const dimensions = await new Promise((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve({ width: img.width, height: img.height })
          img.onerror = () => reject(new Error('Could not read image dimensions'))
          img.src = URL.createObjectURL(file)
        })
        formData.append('dimensions', JSON.stringify(dimensions))
      } catch {
        // Continue without dimensions metadata
      }
    }

    setUploading(true)
    try {
      const response = await fetch('/api/media', { method: 'POST', body: formData })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error?.message || payload?.error || 'Upload failed')
      }
      return payload?.data?.media?.file_url || ''
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message || 'Could not upload file',
      })
      return ''
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    const normalizedTitle = title.trim()
    const normalizedSlug = slugFromText(slug || normalizedTitle || 'web-story')
    const trimmedTags = tagsText.split(',').map((tag) => tag.trim()).filter(Boolean)
    const preparedContentSlides = contentSlides
      .map((slide) => ({
        image: slide.image || '',
        image_alt: slide.image_alt || coverImageAlt || normalizedTitle,
        headline: normalizedTitle,
        description: slide.description || '',
        cta_text: '',
        cta_url: '',
        whatsapp_group_url: '',
        seo_description: '',
      }))
      .filter((slide) => slide.image)

    if (!normalizedTitle) {
      toast({ variant: 'destructive', title: 'Validation error', description: 'Story title is required' })
      return
    }

    if (preparedContentSlides.length < 4) {
      toast({ variant: 'destructive', title: 'Validation error', description: 'Please add at least 4 content slides with images' })
      return
    }

    const fallbackImage = coverImage || preparedContentSlides[0]?.image || ''
    const fallbackAlt = coverImageAlt || normalizedTitle
    const finalSlides = [
      ...preparedContentSlides,
      {
        image: readMoreSlide.image || fallbackImage,
        image_alt: readMoreSlide.image_alt || fallbackAlt,
        headline: normalizedTitle,
        description: readMoreSlide.description || '',
        cta_text: readMoreSlide.cta_text || 'Read more',
        cta_url: readMoreSlide.cta_url || '',
        whatsapp_group_url: '',
        seo_description: '',
      },
      {
        image: whatsappSlide.image || fallbackImage,
        image_alt: whatsappSlide.image_alt || fallbackAlt,
        headline: normalizedTitle,
        description: whatsappSlide.description || '',
        cta_text: '',
        cta_url: '',
        whatsapp_group_url: whatsappSlide.whatsapp_group_url || '',
        seo_description: '',
      },
    ].filter((slide) => slide.image)

    setLoading(true)

    try {
      const payload = {
        title: normalizedTitle,
        slug: normalizedSlug,
        seo_title: seoTitle.trim() || normalizedTitle,
        seo_description: seoDescription.trim() || null,
        canonical_url: canonicalUrl.trim() || null,
        structured_data: structuredData.trim() || null,
        cover_image: coverImage || preparedContentSlides[0]?.image || '',
        cover_image_alt: coverImageAlt.trim() || fallbackAlt,
        category_id: categoryId || null,
        author_id: authorId || null,
        related_article_slug: relatedArticleSlug.trim() || null,
        tags: trimmedTags,
        keywords,
        status,
        published_at: publishDate || null,
        updated_at: updatedDate || null,
        ad_slot: adSlot.trim() || null,
        slides: finalSlides,
      }

      const endpoint = mode === 'edit' ? `/api/web-stories/${storyId}` : '/api/web-stories'
      const method = mode === 'edit' ? 'PATCH' : 'POST'
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to save web story')
      }

      toast({
        title: mode === 'edit' ? 'Story updated' : 'Story created',
        description: userRole === 'author' && status === 'published'
          ? 'Your story was submitted for review.'
          : 'Web story saved successfully.',
      })

      router.push('/dashboard/web-stories')
      router.refresh()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: error.message || 'Could not save web story',
      })
    } finally {
      setLoading(false)
    }
  }

  const derivedSlug = slugFromText(slug || title || 'web-story')

  if (bootstrapping) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Loading web story editor...</p>
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Story Setup</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="story_title">Main Heading</Label>
            <Input id="story_title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter the web story heading" />
          </div>

          <div>
            <Label htmlFor="story_slug">Slug</Label>
            <Input id="story_slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={derivedSlug} />
          </div>

          <div>
            <Label htmlFor="story_seo_title">SEO Title</Label>
            <Input id="story_seo_title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder={title || 'SEO title'} />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="story_seo_description">Meta Description</Label>
            <Textarea id="story_seo_description" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="Short search description for the whole web story" />
          </div>

          <div>
            <Label htmlFor="story_canonical">Canonical URL</Label>
            <Input id="story_canonical" value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} placeholder="https://ekahnews.com/web-stories/story-slug" />
          </div>

          <div>
            <Label htmlFor="story_ad_slot">Ad Slot</Label>
            <Input id="story_ad_slot" value={adSlot} onChange={(e) => setAdSlot(e.target.value)} placeholder="Optional slot identifier" />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="story_structured_data">Structured Data Override (JSON)</Label>
            <Textarea id="story_structured_data" value={structuredData} onChange={(e) => setStructuredData(e.target.value)} className="min-h-[160px] font-mono text-sm" placeholder='{"@context":"https://schema.org"}' />
          </div>

          <div>
            <Label htmlFor="cover_image">Cover Image URL</Label>
            <Input id="cover_image" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="https://..." />
            <Input
              id="cover_image_file"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="mt-2"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                const url = await uploadMedia(file)
                if (url) {
                  setCoverImage(url)
                }
              }}
            />
          </div>

          <div>
            <Label htmlFor="cover_image_alt">Cover Image Alt Text</Label>
            <Input id="cover_image_alt" value={coverImageAlt} onChange={(e) => setCoverImageAlt(e.target.value)} placeholder="Describe the cover image" />
          </div>

          <div>
            <Label>Category</Label>
            <Select value={categoryId || 'none'} onValueChange={(value) => setCategoryId(value === 'none' ? '' : value)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Author</Label>
            <Select value={authorId || undefined} onValueChange={setAuthorId}>
              <SelectTrigger><SelectValue placeholder="Select author" /></SelectTrigger>
              <SelectContent>
                {authors.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="related_article_slug">Related Article Slug</Label>
            <Input id="related_article_slug" value={relatedArticleSlug} onChange={(e) => setRelatedArticleSlug(e.target.value)} placeholder="optional-related-article-slug" />
          </div>

          <div>
            <Label htmlFor="story_tags">Tags</Label>
            <Input id="story_tags" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="news, latest, update" />
          </div>

          <div>
            <Label htmlFor="story_publish_date">Publish Date</Label>
            <Input id="story_publish_date" type="datetime-local" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="story_updated_date">Updated Date</Label>
            <Input id="story_updated_date" type="datetime-local" value={updatedDate} onChange={(e) => setUpdatedDate(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <KeywordInput
              label="Story Keywords"
              value={keywords}
              onChange={setKeywords}
              description="Add up to 10 keywords for the whole story. These feed metadata and structured data."
            />
          </div>

          <div>
            <Label>Status</Label>
            {userRole === 'admin' ? (
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-md border px-3 py-2 text-sm text-gray-600 dark:text-gray-300">{status === 'published' ? 'Published' : 'Draft / Review workflow'}</div>
            )}
            {userRole === 'author' && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Author publish requests are submitted for review automatically.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content Slides</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={addContentSlide}>Add Slide</Button>
          </div>
          {contentSlides.map((slide, idx) => (
            <div key={idx} className="rounded-xl border p-4 dark:border-gray-700">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Slide {idx + 1}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Main heading is shared from story setup</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => moveContentSlide(idx, -1)}>Up</Button>
                  <Button type="button" variant="ghost" onClick={() => moveContentSlide(idx, 1)}>Down</Button>
                  <Button type="button" variant="ghost" onClick={() => removeContentSlide(idx)} disabled={contentSlides.length <= 4}>Remove</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <Label htmlFor={`content_image_${idx}`}>Image URL</Label>
                  <Input id={`content_image_${idx}`} value={slide.image} onChange={(e) => setContentSlide(idx, { image: e.target.value })} placeholder="https://..." />
                  <Input
                    id={`content_file_${idx}`}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="mt-2"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      const url = await uploadMedia(file)
                      if (url) {
                        setContentSlide(idx, {
                          image: url,
                          image_alt: slide.image_alt || coverImageAlt || title || `Slide ${idx + 1} image`,
                        })
                        if (!coverImage && idx === 0) {
                          setCoverImage(url)
                        }
                      }
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor={`content_alt_${idx}`}>Image Alt Text</Label>
                  <Input id={`content_alt_${idx}`} value={slide.image_alt} onChange={(e) => setContentSlide(idx, { image_alt: e.target.value })} placeholder="Describe the image for accessibility" />
                </div>
              </div>

              <div className="mt-4">
                <Label htmlFor={`content_description_${idx}`}>Visible Bottom Text</Label>
                <Textarea id={`content_description_${idx}`} value={slide.description} onChange={(e) => setContentSlide(idx, { description: e.target.value })} placeholder="Short overlay text visible at the bottom of the image" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ending Slides</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-xl border p-4 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white">Read More Slide</h3>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="readmore_image">Background Image URL</Label>
                <Input id="readmore_image" value={readMoreSlide.image} onChange={(e) => setReadMoreSlide((prev) => ({ ...prev, image: e.target.value }))} placeholder={coverImage || 'Uses cover image if left empty'} />
              </div>
              <div>
                <Label htmlFor="readmore_alt">Image Alt Text</Label>
                <Input id="readmore_alt" value={readMoreSlide.image_alt} onChange={(e) => setReadMoreSlide((prev) => ({ ...prev, image_alt: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="readmore_description">Bottom Text</Label>
                <Textarea id="readmore_description" value={readMoreSlide.description} onChange={(e) => setReadMoreSlide((prev) => ({ ...prev, description: e.target.value }))} placeholder="Optional short line for this CTA slide" />
              </div>
              <div>
                <Label htmlFor="readmore_text">Button Text</Label>
                <Input id="readmore_text" value={readMoreSlide.cta_text} onChange={(e) => setReadMoreSlide((prev) => ({ ...prev, cta_text: e.target.value }))} placeholder="Read these stories" />
              </div>
              <div>
                <Label htmlFor="readmore_url">Button URL</Label>
                <Input id="readmore_url" value={readMoreSlide.cta_url} onChange={(e) => setReadMoreSlide((prev) => ({ ...prev, cta_url: e.target.value }))} placeholder="https://ekahnews.com/..." />
              </div>
            </div>
          </div>

          <div className="rounded-xl border p-4 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white">WhatsApp Slide</h3>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="whatsapp_image">Background Image URL</Label>
                <Input id="whatsapp_image" value={whatsappSlide.image} onChange={(e) => setWhatsappSlide((prev) => ({ ...prev, image: e.target.value }))} placeholder={coverImage || 'Uses cover image if left empty'} />
              </div>
              <div>
                <Label htmlFor="whatsapp_alt">Image Alt Text</Label>
                <Input id="whatsapp_alt" value={whatsappSlide.image_alt} onChange={(e) => setWhatsappSlide((prev) => ({ ...prev, image_alt: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="whatsapp_description">Bottom Text</Label>
                <Textarea id="whatsapp_description" value={whatsappSlide.description} onChange={(e) => setWhatsappSlide((prev) => ({ ...prev, description: e.target.value }))} placeholder="Optional short line for this CTA slide" />
              </div>
              <div>
                <Label htmlFor="whatsapp_url">WhatsApp Community URL</Label>
                <Input id="whatsapp_url" value={whatsappSlide.whatsapp_group_url} onChange={(e) => setWhatsappSlide((prev) => ({ ...prev, whatsapp_group_url: e.target.value }))} placeholder="https://chat.whatsapp.com/..." />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4 rounded-2xl border bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div>
          <p className="font-medium text-gray-900 dark:text-white">Ready to publish</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">This story will save story-level SEO metadata plus AMP story slide content.</p>
        </div>
        <Button onClick={save} disabled={loading || uploading}>
          {uploading ? 'Uploading...' : loading ? 'Saving...' : mode === 'edit' ? 'Update Story' : 'Create Story'}
        </Button>
      </div>
    </div>
  )
}

