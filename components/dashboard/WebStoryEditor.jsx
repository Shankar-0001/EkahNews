'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Image as ImageIcon, Info, Sparkles, TriangleAlert, Video } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { slugFromText } from '@/lib/site-config'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import KeywordInput from '@/components/dashboard/KeywordInput'
import TagInput from '@/components/dashboard/TagInput'
import { useToast } from '@/hooks/use-toast'

const MIN_CONTENT_SLIDES = 1
const RECOMMENDED_TITLE_LIMIT = 70
const HARD_TITLE_LIMIT = 90
const RECOMMENDED_SLIDE_TEXT_LIMIT = 180
const HARD_SLIDE_TEXT_LIMIT = 220
const MAX_VIDEO_SECONDS = 30

function emptyContentSlide() {
  return { media_type: 'image', image: '', image_alt: '', video: '', video_duration: null, description: '' }
}

function emptyCtaSlide() {
  return { image: '', image_alt: '', description: '', cta_text: '', cta_url: '', whatsapp_group_url: '' }
}

function normalizeContentSlides(slides = []) {
  const regularSlides = (slides || []).filter((slide) => !slide?.cta_url && !slide?.whatsapp_group_url)
  return regularSlides.length > 0
    ? regularSlides.map((slide) => ({ media_type: slide?.media_type === 'video' ? 'video' : 'image', image: slide?.image || '', image_alt: slide?.image_alt || '', video: slide?.video || '', video_duration: Number(slide?.video_duration) || null, description: slide?.description || '' }))
    : [emptyContentSlide()]
}

function normalizeReadMoreSlide(slides = []) {
  const existing = (slides || []).find((slide) => slide?.cta_url || slide?.cta_text)
  return existing
    ? { image: existing?.image || '', image_alt: existing?.image_alt || '', description: existing?.description || '', cta_text: existing?.cta_text || '', cta_url: existing?.cta_url || '', whatsapp_group_url: '' }
    : emptyCtaSlide()
}

function normalizeWhatsappSlide(slides = []) {
  const existing = (slides || []).find((slide) => slide?.whatsapp_group_url)
  return existing
    ? { image: existing?.image || '', image_alt: existing?.image_alt || '', description: existing?.description || '', cta_text: '', cta_url: '', whatsapp_group_url: existing?.whatsapp_group_url || '' }
    : emptyCtaSlide()
}

function toDateTimeLocal(value) {
  if (!value) return ''
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 16)
}

function normalizeSelectedId(value) {
  if (!value || value === 'none' || value === 'undefined' || value === 'null') return ''
  return value
}

function compactObjectEntries(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined))
}

function truncateText(value, maxLength) {
  const normalized = (value || '').trim()
  if (!normalized) return ''
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3).trim()}...` : normalized
}

function getVideoDuration(file) {
  if (!file) return Promise.resolve(null)

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      const duration = video.duration
      URL.revokeObjectURL(objectUrl)
      resolve(Number.isFinite(duration) ? duration : null)
    }
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Could not read the selected video duration.'))
    }
    video.src = objectUrl
  })
}

function RequiredLabel({ htmlFor, children, required = false }) {
  return (
    <Label htmlFor={htmlFor} className="font-medium text-slate-900 dark:text-white">
      {children}
      {required && <span className="ml-1 text-[#d62828]">*</span>}
    </Label>
  )
}

function FieldHint({ children, tone = 'muted' }) {
  const toneClass = tone === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
  return <p className={`mt-1 text-xs ${toneClass}`}>{children}</p>
}

function CharacterHint({ current, recommended, hard }) {
  const tone = current > hard ? 'text-red-600 dark:text-red-400' : current > recommended ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
  return <p className={`mt-1 text-xs ${tone}`}>{current} characters. Recommended under {recommended}, hard limit {hard}.</p>
}

function GuidanceList() {
  return (
    <Card className="border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-[#d62828]" />
          Google Web Stories Checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
        <div className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" /><p>Use a clear story title, a strong portrait poster image, and concise page text.</p></div>
        <div className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" /><p>Google expects poster metadata, alt text, self-canonical support, and valid AMP story output.</p></div>
        <div className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" /><p>Keep page text short and readable. Avoid overloaded pages and embedded text-heavy images.</p></div>
        <div className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" /><p>Recommended poster size is portrait-first and at least 640x853.</p></div>
      </CardContent>
    </Card>
  )
}

function SlideCard({ idx, slide, title, coverImageAlt, uploadMedia, setContentSlide, moveContentSlide, removeContentSlide, contentSlidesLength, setCoverImage, coverImage, toast }) {
  const descriptionLength = (slide.description || '').trim().length
  const isVideoSlide = slide.media_type === 'video'

  const handleImageUpload = async (file) => {
    const url = await uploadMedia(file)
    if (url) {
      setContentSlide(idx, {
        media_type: 'image',
        image: url,
        image_alt: slide.image_alt || coverImageAlt || title || `Slide ${idx + 1} image`,
      })
      if (!coverImage && idx === 0) setCoverImage(url)
    }
  }

  const handleVideoUpload = async (file) => {
    if (!file) return

    try {
      const duration = await getVideoDuration(file)
      if (!duration) {
        throw new Error('Video duration could not be detected.')
      }
      if (duration > MAX_VIDEO_SECONDS) {
        toast({ variant: 'destructive', title: 'Video too long', description: `Story videos must be ${MAX_VIDEO_SECONDS} seconds or less.` })
        return
      }

      const url = await uploadMedia(file)
      if (url) {
        setContentSlide(idx, {
          media_type: 'video',
          video: url,
          video_duration: Math.round(duration * 10) / 10,
          image_alt: slide.image_alt || coverImageAlt || title || `Slide ${idx + 1} video`,
        })
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Video upload failed', description: error.message || 'Could not prepare video for this slide.' })
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Story Page {idx + 1}</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">The main story title is reused as the slide headline automatically.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => moveContentSlide(idx, -1)}>Up</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => moveContentSlide(idx, 1)}>Down</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => removeContentSlide(idx)} disabled={contentSlidesLength <= MIN_CONTENT_SLIDES}>Remove</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <RequiredLabel htmlFor={`content_media_type_${idx}`} required>Media Type</RequiredLabel>
          <Select value={slide.media_type || 'image'} onValueChange={(value) => setContentSlide(idx, { media_type: value })}>
            <SelectTrigger id={`content_media_type_${idx}`}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="video">Video under 30 seconds</SelectItem>
            </SelectContent>
          </Select>
          <FieldHint>Video story pages must stay under 30 seconds to keep the AMP story valid.</FieldHint>
        </div>

        <div>
          <RequiredLabel htmlFor={`content_alt_${idx}`} required>{isVideoSlide ? "Media Alt Text" : "Image Alt Text"}</RequiredLabel>
          <Input id={`content_alt_${idx}`} value={slide.image_alt} onChange={(e) => setContentSlide(idx, { image_alt: e.target.value })} placeholder={isVideoSlide ? "Describe the video for accessibility" : "Describe the image for accessibility"} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <RequiredLabel htmlFor={`content_image_${idx}`} required={!isVideoSlide}>Slide Image</RequiredLabel>
          <Input id={`content_image_${idx}`} value={slide.image} onChange={(e) => setContentSlide(idx, { media_type: "image", image: e.target.value })} placeholder="https://..." />
          <Input
            id={`content_file_${idx}`}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="mt-2"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              await handleImageUpload(file)
            }}
          />
          <FieldHint>{isVideoSlide ? "Optional poster image for the video slide." : "Use a portrait-friendly image and avoid burned-in copy."}</FieldHint>
        </div>

        <div>
          <RequiredLabel htmlFor={`content_video_${idx}`} required={isVideoSlide}>Slide Video URL</RequiredLabel>
          <Input id={`content_video_${idx}`} value={slide.video || ""} onChange={(e) => setContentSlide(idx, { media_type: "video", video: e.target.value })} placeholder="https://..." />
          <Input
            id={`content_video_file_${idx}`}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="mt-2"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              await handleVideoUpload(file)
            }}
          />
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_160px]">
            <Input
              id={`content_video_duration_${idx}`}
              type="number"
              min="0"
              max={MAX_VIDEO_SECONDS}
              step="0.1"
              value={slide.video_duration ?? ""}
              onChange={(e) => setContentSlide(idx, { media_type: "video", video_duration: e.target.value ? Number(e.target.value) : null })}
              placeholder="Duration (seconds)"
            />
            <div className="flex items-center rounded-md border border-slate-200 px-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <Video className="mr-2 h-4 w-4" /> Max {MAX_VIDEO_SECONDS}s
            </div>
          </div>
          <FieldHint tone={isVideoSlide && Number(slide.video_duration) > MAX_VIDEO_SECONDS ? "warning" : "muted"}>If you paste a video URL manually, also set the duration. The hard limit is {MAX_VIDEO_SECONDS} seconds.</FieldHint>
        </div>
      </div>

      <div className="mt-4">
        <RequiredLabel htmlFor={`content_description_${idx}`} required>Visible Bottom Text</RequiredLabel>
        <Textarea id={`content_description_${idx}`} value={slide.description} onChange={(e) => setContentSlide(idx, { description: e.target.value })} placeholder="Short, readable text for this page" className="min-h-[110px]" />
        <CharacterHint current={descriptionLength} recommended={RECOMMENDED_SLIDE_TEXT_LIMIT} hard={HARD_SLIDE_TEXT_LIMIT} />
      </div>
    </div>
  )
}

function EndingSlideCard({ title, description, imageId, imageValue, altId, altValue, onImageChange, onAltChange, onDescriptionChange, fileId, onFileChange, children }) {
  const descriptionLength = (description || '').trim().length

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
      <div className="mt-4 space-y-4">
        <div>
          <RequiredLabel htmlFor={imageId} required>Background Image</RequiredLabel>
          <Input id={imageId} value={imageValue} onChange={onImageChange} placeholder="https://..." />
          <Input id={fileId} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="mt-2" onChange={onFileChange} />
        </div>
        <div>
          <RequiredLabel htmlFor={altId} required>Image Alt Text</RequiredLabel>
          <Input id={altId} value={altValue} onChange={onAltChange} placeholder="Describe the background image" />
        </div>
        <div>
          <RequiredLabel htmlFor={`${imageId}_description`} required>Bottom Text</RequiredLabel>
          <Textarea id={`${imageId}_description`} value={description} onChange={onDescriptionChange} placeholder="Short CTA supporting text" />
          <CharacterHint current={descriptionLength} recommended={RECOMMENDED_SLIDE_TEXT_LIMIT} hard={HARD_SLIDE_TEXT_LIMIT} />
        </div>
        {children}
      </div>
    </div>
  )
}

export default function WebStoryEditor({ mode = 'create', storyId = null }) {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
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
  const [selectedTags, setSelectedTags] = useState([])
  const [keywords, setKeywords] = useState([])
  const [status, setStatus] = useState('draft')
  const [publishDate, setPublishDate] = useState('')
  const [updatedDate, setUpdatedDate] = useState('')
  const [adSlot, setAdSlot] = useState('')
  const [contentSlides, setContentSlides] = useState([emptyContentSlide()])
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

        const [{ data: userRow }, { data: categoryRows }, { data: tagRows }] = await Promise.all([
          supabase.from('users').select('role').eq('id', authData.user.id).single(),
          supabase.from('categories').select('id, name').order('name'),
          supabase.from('tags').select('id, name, slug').order('name'),
        ])

        const nextRole = userRow?.role || 'author'
        setUserRole(nextRole)
        setCategories(categoryRows || [])
        setTags(tagRows || [])

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
          setSelectedTags((story.web_story_tags || []).map((entry) => entry.tag_id).filter(Boolean))
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
        toast({ variant: 'destructive', title: 'Could not load editor', description: error.message || 'Failed to initialize web story editor' })
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
    setContentSlides((prev) => (prev.length <= MIN_CONTENT_SLIDES ? prev : prev.filter((_, index) => index !== idx)))
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

  const createTag = async (rawName) => {
    const name = rawName.trim()
    if (!name) return null

    const response = await fetch('/api/articles/tags', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const result = await response.json().catch(() => ({}))

    if (response.ok && result?.data?.tag) {
      const createdTag = result.data.tag
      setTags((prev) => {
        if (prev.some((tag) => tag.id === createdTag.id)) return prev
        return [...prev, createdTag].sort((a, b) => a.name.localeCompare(b.name))
      })
      return createdTag
    }

    toast({
      variant: 'destructive',
      title: 'Tag creation failed',
      description: result?.error || 'Could not create tag',
    })
    return null
  }

  const uploadMedia = async (file) => {
    if (!file) return ''

    const formData = new FormData()
    formData.append('file', file)

    if (file.type.startsWith('image/')) {
      try {
        const dimensions = await new Promise((resolve, reject) => {
          const image = new window.Image()
          image.onload = () => resolve({ width: image.width, height: image.height })
          image.onerror = () => reject(new Error('Could not read image dimensions'))
          image.src = URL.createObjectURL(file)
        })
        formData.append('dimensions', JSON.stringify(dimensions))
      } catch {
        // Ignore dimension extraction failures
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
      toast({ variant: 'destructive', title: 'Upload failed', description: error.message || 'Could not upload file' })
      return ''
    } finally {
      setUploading(false)
    }
  }

  const titleLength = (title || '').trim().length
  const slideWarnings = contentSlides.flatMap((slide, index) => {
    const issues = []
    const descriptionLength = (slide.description || '').trim().length
    const isVideoSlide = slide.media_type === 'video'
    const duration = Number(slide.video_duration)
    if (descriptionLength > RECOMMENDED_SLIDE_TEXT_LIMIT && descriptionLength <= HARD_SLIDE_TEXT_LIMIT) {
      issues.push(`Page ${index + 1} text is getting long. Keep it tighter for Web Stories.`)
    }
    if (descriptionLength > HARD_SLIDE_TEXT_LIMIT) {
      issues.push(`Page ${index + 1} text exceeds the supported limit.`)
    }
    if (isVideoSlide && !slide.video) {
      issues.push(`Page ${index + 1} is set to video but does not have a video URL yet.`)
    }
    if (isVideoSlide && (!Number.isFinite(duration) || duration <= 0)) {
      issues.push(`Page ${index + 1} needs a video duration.`)
    }
    if (isVideoSlide && Number.isFinite(duration) && duration > MAX_VIDEO_SECONDS) {
      issues.push(`Page ${index + 1} video is longer than ${MAX_VIDEO_SECONDS} seconds.`)
    }
    return issues
  })

  const storyWarnings = [
    ...(titleLength > RECOMMENDED_TITLE_LIMIT ? [`Story title is longer than the recommended ${RECOMMENDED_TITLE_LIMIT} characters.`] : []),
    ...(!coverImage ? ['Poster image is missing. Google expects a poster portrait image for Web Stories.'] : []),
    ...(!seoDescription.trim() ? ['SEO description is empty. Published stories should include one.'] : []),
    ...slideWarnings,
  ]

  const save = async () => {
    const normalizedTitle = title.trim()
    const normalizedSlideHeadline = truncateText(normalizedTitle, HARD_TITLE_LIMIT)
    const normalizedSlug = slugFromText(slug || normalizedTitle || 'web-story')
    const preparedContentSlides = contentSlides
      .map((slide) => ({
        media_type: slide.media_type === 'video' ? 'video' : 'image',
        image: slide.image || '',
        image_alt: slide.image_alt || coverImageAlt || normalizedTitle,
        video: slide.video || '',
        video_duration: slide.media_type === 'video' && Number.isFinite(Number(slide.video_duration)) ? Number(slide.video_duration) : null,
        headline: normalizedSlideHeadline,
        description: slide.description || '',
        cta_text: '',
        cta_url: '',
        whatsapp_group_url: '',
        seo_description: '',
      }))
      .filter((slide) => slide.image || slide.video)

    if (!normalizedTitle) {
      toast({ variant: 'destructive', title: 'Validation error', description: 'Story title is required.' })
      return
    }

    if (preparedContentSlides.length < MIN_CONTENT_SLIDES) {
      toast({ variant: "destructive", title: "Validation error", description: `Please add at least ${MIN_CONTENT_SLIDES} story pages with image or video media.` })
      return
    }

    const fallbackImage = coverImage || preparedContentSlides[0]?.image || ""
    const fallbackAlt = coverImageAlt || normalizedTitle
    const hasReadMoreSlide = Boolean(
      (readMoreSlide.image || fallbackImage)
      && (readMoreSlide.description?.trim() || readMoreSlide.cta_text?.trim() || readMoreSlide.cta_url?.trim())
    )
    const hasWhatsappSlide = Boolean(
      whatsappSlide.whatsapp_group_url?.trim()
      || (
        (whatsappSlide.image || fallbackImage)
        && whatsappSlide.description?.trim()
      )
    )

    const finalSlides = [
      ...preparedContentSlides,
      ...(hasReadMoreSlide ? [{
        media_type: 'image',
        image: readMoreSlide.image || fallbackImage,
        image_alt: readMoreSlide.image_alt || fallbackAlt,
        video: '',
        video_duration: null,
        headline: normalizedSlideHeadline,
        description: readMoreSlide.description || 'Explore more headlines and related coverage.',
        cta_text: readMoreSlide.cta_text || 'Read more',
        cta_url: readMoreSlide.cta_url || '',
        whatsapp_group_url: '',
        seo_description: '',
      }] : []),
      ...(hasWhatsappSlide ? [{
        media_type: 'image',
        image: whatsappSlide.image || fallbackImage,
        image_alt: whatsappSlide.image_alt || fallbackAlt,
        video: '',
        video_duration: null,
        headline: normalizedSlideHeadline,
        description: whatsappSlide.description || 'Get more updates and alerts from our WhatsApp community.',
        cta_text: '',
        cta_url: '',
        whatsapp_group_url: whatsappSlide.whatsapp_group_url || "",
        seo_description: '',
      }] : []),
    ].filter((slide) => slide.image || slide.video)

    const normalizedCategoryId = normalizeSelectedId(categoryId)
    const normalizedAuthorId = normalizeSelectedId(authorId)

    setLoading(true)

    try {
      const payload = compactObjectEntries({
        title: normalizedTitle,
        slug: normalizedSlug,
        seo_title: truncateText(seoTitle.trim() || normalizedTitle, 110),
        seo_description: truncateText(seoDescription.trim() || preparedContentSlides[0]?.description || normalizedTitle, 200) || null,
        canonical_url: canonicalUrl.trim() || null,
        structured_data: structuredData.trim() || null,
        cover_image: coverImage || preparedContentSlides[0]?.image || '',
        cover_image_alt: coverImageAlt.trim() || fallbackAlt,
        category_id: normalizedCategoryId || null,
        author_id: normalizedAuthorId || null,
        related_article_slug: relatedArticleSlug.trim() || null,
        tags: selectedTags,
        keywords,
        status,
        published_at: publishDate || null,
        updated_at: updatedDate || null,
        ad_slot: adSlot.trim() || null,
        slides: finalSlides,
      })

      const endpoint = mode === 'edit' ? `/api/web-stories/${storyId}` : '/api/web-stories'
      const method = mode === 'edit' ? 'PATCH' : 'POST'
      const response = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        const errorPayload = result?.error
        const issues = Array.isArray(errorPayload?.issues) ? errorPayload.issues : []
        const message = typeof errorPayload === 'string' ? errorPayload : errorPayload?.message || 'Failed to save web story'
        console.error('Web story save failed', { status: response.status, payload, response: result })
        throw new Error(issues.length > 0 ? issues.join('\n') : message)
      }

      const savedStory = result?.data?.story
      const finalStatus = savedStory?.status || status
      toast({
        title: mode === 'edit' ? 'Story updated' : 'Story created',
        description: finalStatus === 'published'
          ? 'Web story is live and visible on the public web stories pages.'
          : finalStatus === 'pending'
            ? 'Web story was saved and sent for review. It will appear publicly after approval.'
            : 'Web story saved as draft in the dashboard.',
      })

      router.push('/dashboard/web-stories')
      router.refresh()
    } catch (error) {
      toast({ variant: 'destructive', title: 'Save failed', description: error.message || 'Could not save web story' })
    } finally {
      setLoading(false)
    }
  }

  const derivedSlug = slugFromText(slug || title || 'web-story')

  if (bootstrapping) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Loading web story editor...</p>
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3"><CardTitle>Story Setup</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <RequiredLabel htmlFor="story_title" required>Story Title</RequiredLabel>
                <Input id="story_title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter the story title" />
                <CharacterHint current={titleLength} recommended={RECOMMENDED_TITLE_LIMIT} hard={HARD_TITLE_LIMIT} />
              </div>

              <div>
                <RequiredLabel htmlFor="story_slug" required>Slug</RequiredLabel>
                <Input id="story_slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={derivedSlug} />
                <FieldHint>Self-canonical story URLs help Google index Web Stories properly.</FieldHint>
              </div>

              <div>
                <RequiredLabel htmlFor="story_seo_title" required>SEO Title</RequiredLabel>
                <Input id="story_seo_title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder={title || 'SEO title'} />
                <FieldHint>Used in metadata and should stay concise.</FieldHint>
              </div>

              <div className="md:col-span-2">
                <RequiredLabel htmlFor="story_seo_description" required>SEO Description</RequiredLabel>
                <Textarea id="story_seo_description" value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="Describe the full story in one short summary" />
                <CharacterHint current={(seoDescription || '').trim().length} recommended={160} hard={200} />
              </div>

              <div>
                <RequiredLabel htmlFor="cover_image" required>Poster / Cover Image</RequiredLabel>
                <Input id="cover_image" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="https://..." />
                <Input
                  id="cover_image_file"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="mt-2"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    const url = await uploadMedia(file)
                    if (url) setCoverImage(url)
                  }}
                />
                <FieldHint>Recommended: portrait image, at least 640x853, no burned-in text.</FieldHint>
              </div>

              <div>
                <RequiredLabel htmlFor="cover_image_alt" required>Poster Image Alt Text</RequiredLabel>
                <Input id="cover_image_alt" value={coverImageAlt} onChange={(e) => setCoverImageAlt(e.target.value)} placeholder="Describe the poster image" />
              </div>

              <div>
                <RequiredLabel htmlFor="story_author" required>Author</RequiredLabel>
                <Select value={normalizeSelectedId(authorId) || 'none'} onValueChange={(value) => setAuthorId(value === 'none' ? '' : value)}>
                  <SelectTrigger id="story_author"><SelectValue placeholder="Select author" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {authors.map((author) => <SelectItem key={author.id} value={author.id}>{author.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <RequiredLabel htmlFor="story_category">Category</RequiredLabel>
                <Select value={categoryId || 'none'} onValueChange={(value) => setCategoryId(value === 'none' ? '' : value)}>
                  <SelectTrigger id="story_category"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <RequiredLabel htmlFor="story_publish_date">Publish Date</RequiredLabel>
                <Input id="story_publish_date" type="datetime-local" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
              </div>

              <div>
                <RequiredLabel htmlFor="story_updated_date">Updated Date</RequiredLabel>
                <Input id="story_updated_date" type="datetime-local" value={updatedDate} onChange={(e) => setUpdatedDate(e.target.value)} />
              </div>

              <div>
                <RequiredLabel htmlFor="story_canonical">Canonical URL Override</RequiredLabel>
                <Input id="story_canonical" value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} placeholder="https://www.ekahnews.com/web-stories/story-slug" />
                <FieldHint>Optional override. The API already builds a self-canonical URL by default.</FieldHint>
              </div>

              <div>
                <RequiredLabel htmlFor="related_article_slug">Related Article Slug</RequiredLabel>
                <Input id="related_article_slug" value={relatedArticleSlug} onChange={(e) => setRelatedArticleSlug(e.target.value)} placeholder="optional-related-article-slug" />
              </div>

              <div className="md:col-span-2">
                <TagInput
                  label="Tags"
                  tags={tags}
                  value={selectedTags}
                  onChange={setSelectedTags}
                  onCreateTag={createTag}
                  description="Type a tag and press Enter to add it. Both admins and authors can create missing tags here."
                />
              </div>

              <div>
                <RequiredLabel htmlFor="story_ad_slot">Ad Slot</RequiredLabel>
                <Input id="story_ad_slot" value={adSlot} onChange={(e) => setAdSlot(e.target.value)} placeholder="Optional slot identifier" />
              </div>

              <div className="md:col-span-2">
                <KeywordInput label="Story Keywords" value={keywords} onChange={setKeywords} description="Optional keyword set for metadata and story discovery." />
              </div>

              <div className="md:col-span-2">
                <RequiredLabel htmlFor="story_structured_data">Structured Data Override (JSON)</RequiredLabel>
                <Textarea id="story_structured_data" value={structuredData} onChange={(e) => setStructuredData(e.target.value)} className="min-h-[160px] font-mono text-sm" placeholder='{"@context":"https://schema.org"}' />
              </div>

              <div>
                <RequiredLabel htmlFor="story_status">Status</RequiredLabel>
                {userRole === 'admin' ? (
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="story_status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending Review</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">{status === 'published' ? 'Publish request will be submitted for review' : 'Draft'}</div>
                )}
                {userRole === 'author' && <FieldHint>Author publish requests are submitted as pending, so they stay in the dashboard until approved.</FieldHint>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3"><CardTitle>Story Pages</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Required structure</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Build at least {MIN_CONTENT_SLIDES} content pages. Each page needs image or video media, alt text, and visible text.</p>
                </div>
                <Button type="button" variant="outline" onClick={addContentSlide}>Add Page</Button>
              </div>

              {contentSlides.map((slide, idx) => (
                <SlideCard key={idx} idx={idx} slide={slide} title={title} coverImageAlt={coverImageAlt} uploadMedia={uploadMedia} setContentSlide={setContentSlide} moveContentSlide={moveContentSlide} removeContentSlide={removeContentSlide} contentSlidesLength={contentSlides.length} setCoverImage={setCoverImage} coverImage={coverImage} toast={toast} />
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3"><CardTitle>Ending Pages</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <EndingSlideCard
                title="Read More Page"
                description={readMoreSlide.description}
                imageId="readmore_image"
                imageValue={readMoreSlide.image}
                altId="readmore_alt"
                altValue={readMoreSlide.image_alt}
                onImageChange={(e) => setReadMoreSlide((prev) => ({ ...prev, image: e.target.value }))}
                onAltChange={(e) => setReadMoreSlide((prev) => ({ ...prev, image_alt: e.target.value }))}
                onDescriptionChange={(e) => setReadMoreSlide((prev) => ({ ...prev, description: e.target.value }))}
                fileId="readmore_image_file"
                onFileChange={async (e) => {
                  const file = e.target.files?.[0]
                  const url = await uploadMedia(file)
                  if (url) {
                    setReadMoreSlide((prev) => ({ ...prev, image: url, image_alt: prev.image_alt || coverImageAlt || title || 'Read more slide image' }))
                  }
                }}
              >
                <div>
                  <RequiredLabel htmlFor="readmore_text">Button Text</RequiredLabel>
                  <Input id="readmore_text" value={readMoreSlide.cta_text} onChange={(e) => setReadMoreSlide((prev) => ({ ...prev, cta_text: e.target.value }))} placeholder="Read more" />
                </div>
                <div>
                  <RequiredLabel htmlFor="readmore_url">Button URL</RequiredLabel>
                  <Input id="readmore_url" value={readMoreSlide.cta_url} onChange={(e) => setReadMoreSlide((prev) => ({ ...prev, cta_url: e.target.value }))} placeholder="https://www.ekahnews.com/..." />
                </div>
              </EndingSlideCard>

              <EndingSlideCard
                title="WhatsApp / Community Page"
                description={whatsappSlide.description}
                imageId="whatsapp_image"
                imageValue={whatsappSlide.image}
                altId="whatsapp_alt"
                altValue={whatsappSlide.image_alt}
                onImageChange={(e) => setWhatsappSlide((prev) => ({ ...prev, image: e.target.value }))}
                onAltChange={(e) => setWhatsappSlide((prev) => ({ ...prev, image_alt: e.target.value }))}
                onDescriptionChange={(e) => setWhatsappSlide((prev) => ({ ...prev, description: e.target.value }))}
                fileId="whatsapp_image_file"
                onFileChange={async (e) => {
                  const file = e.target.files?.[0]
                  const url = await uploadMedia(file)
                  if (url) {
                    setWhatsappSlide((prev) => ({ ...prev, image: url, image_alt: prev.image_alt || coverImageAlt || title || 'WhatsApp slide image' }))
                  }
                }}
              >
                <div>
                  <RequiredLabel htmlFor="whatsapp_url">WhatsApp Community URL</RequiredLabel>
                  <Input id="whatsapp_url" value={whatsappSlide.whatsapp_group_url} onChange={(e) => setWhatsappSlide((prev) => ({ ...prev, whatsapp_group_url: e.target.value }))} placeholder="https://chat.whatsapp.com/..." />
                </div>
              </EndingSlideCard>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div>
              <p className="font-medium text-slate-900 dark:text-white">Ready to publish</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Mandatory fields are marked with *. This editor stores story-level metadata plus AMP story slide content.</p>
            </div>
            <Button onClick={save} disabled={loading || uploading}>
              {uploading ? 'Uploading...' : loading ? 'Saving...' : mode === 'edit' ? 'Update Story' : 'Create Story'}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <GuidanceList />

          <Card className="border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg"><Info className="h-5 w-5 text-[#d62828]" />Story Quality</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-sm font-medium text-slate-900 dark:text-white">Slide count</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{contentSlides.length} content pages configured. Minimum required: {MIN_CONTENT_SLIDES}.</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-sm font-medium text-slate-900 dark:text-white">Poster readiness</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{coverImage ? 'Poster image is set.' : 'Poster image is missing.'}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Video slides are supported when they stay at or under {MAX_VIDEO_SECONDS} seconds.</p>
              </div>

              {storyWarnings.length > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/30">
                  <div className="flex items-center gap-2"><TriangleAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" /><p className="text-sm font-medium text-amber-900 dark:text-amber-200">Recommended fixes</p></div>
                  <div className="mt-2 space-y-2 text-sm text-amber-800 dark:text-amber-300">
                    {storyWarnings.map((warning, index) => <p key={index}>{warning}</p>)}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /><p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">No major story-quality warnings</p></div>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-center gap-2"><ImageIcon className="h-4 w-4 text-[#d62828]" /><p className="text-sm font-medium text-slate-900 dark:text-white">Publisher guidance</p></div>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Publisher branding, self-canonical handling, and story routing are handled at the app level. This editor focuses on story content quality and metadata completeness.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

