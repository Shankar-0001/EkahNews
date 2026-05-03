'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import {
  validateImageFile,
  compressImage,
  generateStoragePath,
  getImageDimensions,
} from '@/lib/image-utils'
import { formatFileSize } from '@/lib/image-utils'
import SafeHtmlPreview from '@/components/SafeHtmlPreview'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import KeywordInput from '@/components/dashboard/KeywordInput'
import TagInput from '@/components/dashboard/TagInput'
import ArticlePublishingChecklist from '@/components/dashboard/ArticlePublishingChecklist'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Eye, Save, Send, CheckCircle, AlertTriangle } from 'lucide-react'
import { createSlug } from '@/lib/slug'
import { filterEditorialCategories, isFeedOnlyCategorySlug } from '@/lib/category-utils'

const TipTapEditor = dynamic(() => import('@/components/editor/TipTapEditor'), {
  ssr: false,
  loading: () => <p className="text-sm text-gray-500">Loading editor...</p>,
})

const ARTICLE_DRAFT_STORAGE_KEY = 'ekahnews:new-article-draft'

function getApiErrorMessage(errorPayload, fallbackMessage) {
  if (!errorPayload) return fallbackMessage
  if (typeof errorPayload === 'string') return errorPayload
  if (typeof errorPayload === 'object') {
    const firstFieldError = Object.values(errorPayload).find((value) => typeof value === 'string' && value.trim())
    if (firstFieldError) return firstFieldError
  }
  return fallbackMessage
}

function validateSubmissionReadiness({
  title,
  excerpt,
  content,
  categoryId,
  featuredImage,
  featuredImageAlt,
  seoTitle,
  seoDescription,
  nextStatus,
}) {
  if (!title.trim()) return 'Article title is required'
  if (!content.html || content.html.trim().length === 0) return 'Article content cannot be empty'
  if (nextStatus !== 'draft' && nextStatus !== 'archived') {
    if (!categoryId) return 'Category is required before submission'
    if (!excerpt.trim()) return 'Excerpt is required before submission'
    if (!featuredImage) return 'Featured image is required before submission'
    if (!featuredImageAlt.trim()) return 'Featured image alt text is required before submission'
    if (!seoTitle.trim()) return 'SEO title is required before submission'
    if (!seoDescription.trim()) return 'SEO description is required before submission'
  }
  return ''
}

function RequiredLabel({ children }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{children}</span>
      <span className="text-red-600 dark:text-red-400">*</span>
    </span>
  )
}

function getSeoCounterClassName(length, idealMin, idealMax) {
  if (length > idealMax) return 'text-xs mt-1 text-red-600 dark:text-red-400'
  if (length >= idealMin) return 'text-xs mt-1 text-emerald-600 dark:text-emerald-400'
  return 'text-xs mt-1 text-gray-500 dark:text-gray-400'
}

export default function ArticleEditorPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [authorId, setAuthorId] = useState(null)
  const [selectedAuthorId, setSelectedAuthorId] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState(null)
  const [contentType, setContentType] = useState('news')

  // Form state
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState({ json: null, html: '' })
  const [categoryId, setCategoryId] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [featuredImage, setFeaturedImage] = useState('')
  const [featuredImageAlt, setFeaturedImageAlt] = useState('')
  const [ogImage, setOgImage] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [canonicalUrl, setCanonicalUrl] = useState('')
  const [schemaType, setSchemaType] = useState('NewsArticle')
  const [structuredData, setStructuredData] = useState('')
  const [keywords, setKeywords] = useState([])
  const [status, setStatus] = useState('published')
  const [publishDate, setPublishDate] = useState('')
  const [updatedDate, setUpdatedDate] = useState('')

  // Options
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [authors, setAuthors] = useState([])

  useEffect(() => {
    if (typeof window === 'undefined' || initializing) {
      return
    }

    const draftPayload = {
      contentType,
      title,
      slug,
      excerpt,
      content,
      categoryId,
      selectedTags,
      featuredImage,
      featuredImageAlt,
      ogImage,
      seoTitle,
      seoDescription,
      canonicalUrl,
      schemaType,
      structuredData,
      keywords,
      status,
      publishDate,
      updatedDate,
      selectedAuthorId,
    }

    window.localStorage.setItem(ARTICLE_DRAFT_STORAGE_KEY, JSON.stringify(draftPayload))
  }, [
    initializing,
    contentType,
    title,
    slug,
    excerpt,
    content,
    categoryId,
    selectedTags,
    featuredImage,
    featuredImageAlt,
    ogImage,
    seoTitle,
    seoDescription,
    canonicalUrl,
    schemaType,
    structuredData,
    keywords,
    status,
    publishDate,
    updatedDate,
    selectedAuthorId,
  ])

  useEffect(() => {
    loadUserAndData()
  }, [])

  useEffect(() => {
    if (contentType === 'article') {
      setSchemaType('BlogPosting')
      if (status === 'archived') {
        setStatus('draft')
      }
      return
    }

    if (contentType === 'news') {
      setSchemaType('NewsArticle')
      return
    }

    setShowPreview(false)
  }, [contentType, status])

  const loadUserAndData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Get user role and author ID
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!userData) {
        setError('Could not determine user role. Please login again.')
        return
      }

      setUserRole(userData.role)

      const { data: authorData } = await supabase
        .from('authors')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!authorData) {
        setError('No author profile found. Please contact an administrator.')
        return
      }

      setAuthorId(authorData.id)

      // Load categories and tags
      const [{ data: categoriesData }, { data: tagsData }] = await Promise.all([
        supabase.from('categories').select('id, name, slug').order('name'),
        supabase.from('tags').select('id, name').order('name'),
      ])

      if (userData.role === 'admin') {
        const { data: authorsData } = await supabase
          .from('authors')
          .select('id, name')
          .order('name')

        setAuthors(authorsData || [])
      } else {
        const ownAuthor = { id: authorData.id, name: user.email?.split('@')[0] || 'Me' }
        setAuthors([ownAuthor])
      }

      const resolvedCategories = categoriesData || []
      const editorialCategories = filterEditorialCategories(resolvedCategories)
      const savedDraft = typeof window !== 'undefined'
        ? window.localStorage.getItem(ARTICLE_DRAFT_STORAGE_KEY)
        : null
      let parsedDraft = null
      if (savedDraft) {
        try {
          parsedDraft = JSON.parse(savedDraft)
        } catch {
          window.localStorage.removeItem(ARTICLE_DRAFT_STORAGE_KEY)
        }
      }

      setCategories(editorialCategories)
      setTags(tagsData || [])
      setSelectedAuthorId(parsedDraft?.selectedAuthorId || authorData.id)

      if (parsedDraft) {
        setContentType(parsedDraft.contentType || 'news')
        setTitle(parsedDraft.title || '')
        setSlug(parsedDraft.slug || '')
        setExcerpt(parsedDraft.excerpt || '')
        setContent(parsedDraft.content || { json: null, html: '' })
        setCategoryId(
          parsedDraft.categoryId && !isFeedOnlyCategorySlug(
            resolvedCategories.find((category) => category.id === parsedDraft.categoryId)?.slug
          )
            ? parsedDraft.categoryId
            : ''
        )
        setSelectedTags(Array.isArray(parsedDraft.selectedTags) ? parsedDraft.selectedTags : [])
        setFeaturedImage(parsedDraft.featuredImage || '')
        setFeaturedImageAlt(parsedDraft.featuredImageAlt || '')
        setOgImage(parsedDraft.ogImage || '')
        setSeoTitle(parsedDraft.seoTitle || '')
        setSeoDescription(parsedDraft.seoDescription || '')
        setCanonicalUrl(parsedDraft.canonicalUrl || '')
        setSchemaType(parsedDraft.schemaType || 'NewsArticle')
        setStructuredData(parsedDraft.structuredData || '')
        setKeywords(Array.isArray(parsedDraft.keywords) ? parsedDraft.keywords : [])
        setStatus(parsedDraft.status || 'published')
        setPublishDate(parsedDraft.publishDate || '')
        setUpdatedDate(parsedDraft.updatedDate || '')
      }
      setInitializing(false)
    } catch (err) {
      console.error('Error loading user data:', err)
      setError(err.message || 'Failed to load user data')
      setInitializing(false)
    }
  }

  const handleTitleChange = (newTitle) => {
    setTitle(newTitle)
    if (!slug || slug === createSlug(title || '')) {
      setSlug(createSlug(newTitle))
    }
  }

  const toIsoDateTime = (value) => {
    if (!value) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
  }

  const handleImageUpload = async (file) => {
    return new Promise(async (resolve) => {
      if (!file) {
        resolve(null)
        return
      }

      try {
        // Validate image
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

        // Get image dimensions
        const dimensions = await getImageDimensions(file)

        // Warn if image is smaller than recommended
        if (dimensions.width < 1200 || dimensions.height < 630) {
          toast({
            title: 'Warning',
            description: `Image is ${dimensions.width}x${dimensions.height}. For best quality, use at least 1200x630px.`,
          })
        }

        // Compress image
        const compressedFile = await compressImage(file, 1920, 1920)

        // Upload to Supabase Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = generateStoragePath('articles', fileName)

        const { data, error } = await supabase.storage
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

        // Save to media library
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

        toast({
          title: 'Success',
          description: `Image uploaded (${formatFileSize(compressedFile.size)})`,
        })

        resolve(publicUrl)
      } catch (err) {
        console.error('Error uploading image:', err)
        toast({
          variant: 'destructive',
          title: 'Upload error',
          description: err.message || 'Failed to upload image',
        })
        resolve(null)
      }
    })
  }

  const savArticle = async (newStatus) => {
    const finalStatus = userRole === 'author' ? 'pending' : newStatus
    const readinessError = validateSubmissionReadiness({
      title,
      excerpt,
      content,
      categoryId,
      featuredImage,
      featuredImageAlt,
      seoTitle,
      seoDescription,
      nextStatus: finalStatus,
    })

    if (readinessError) {
      toast({
        variant: 'destructive',
        title: 'Validation error',
        description: readinessError,
      })
      return
    }

    if (!authorId) {
      setError('Error: Could not find your author profile')
      return
    }

    setLoading(true)
    setError(null)

    let createdArticleId = null

    try {
      const normalizedPublishedAt = finalStatus === 'published'
        ? (toIsoDateTime(publishDate) || new Date().toISOString())
        : null
      const normalizedUpdatedAt = toIsoDateTime(updatedDate) || new Date().toISOString()
      const articleData = {
        title: title.trim(),
        slug: slug || createSlug(title),
        excerpt: excerpt.trim(),
        content: content.html,
        content_json: content.json,
        category_id: categoryId || null,
        featured_image_url: featuredImage || null,
        featured_image_alt: featuredImageAlt?.trim() || null,
        og_image: ogImage.trim() || null,
        seo_title: seoTitle || title,
        seo_description: seoDescription || excerpt,
        canonical_url: canonicalUrl.trim() || null,
        schema_type: schemaType,
        structured_data: structuredData.trim() || null,
        keywords,
        status: finalStatus,
        published_at: normalizedPublishedAt,
        updated_at: normalizedUpdatedAt,
        author_id: selectedAuthorId || authorId,
      }

      const response = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(articleData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(getApiErrorMessage(result.error, 'Failed to create article'))
      }

      const article = result?.data?.article
      createdArticleId = article?.id || null

      if (selectedTags.length > 0 && article?.id) {
        const tagRelations = selectedTags.map(tagId => ({
          article_id: article.id,
          tag_id: tagId,
        }))

        const tagsResponse = await fetch('/api/articles/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tagRelations),
        })

        if (!tagsResponse.ok) {
          const tagsPayload = await tagsResponse.json().catch(() => ({}))
          throw new Error(tagsPayload?.error || 'Article created, but selected tags could not be saved')
        }
      }

      const statusMessages = {
        draft: 'Article saved as draft',
        pending: 'Article submitted for review',
        published: 'Article published successfully',
        archived: 'Article archived successfully',
      }

      toast({
        title: 'Success',
        description: statusMessages[finalStatus] || 'Article created successfully',
      })

      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(ARTICLE_DRAFT_STORAGE_KEY)
      }

      router.push('/dashboard/articles')
    } catch (err) {
      setError(err.message || 'Failed to save article')
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to save article',
      })
      if (createdArticleId) {
        router.push(`/dashboard/articles/${createdArticleId}/edit`)
      }
    } finally {
      setLoading(false)
    }
  }

  const createTag = async (rawName) => {
    const name = rawName.trim()
    if (!name) return

    const newSlug = createSlug(name)
    const response = await fetch('/api/articles/tags', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug: newSlug }),
    })
    const result = await response.json()
    if (response.ok && result?.data?.tag) {
      const createdTag = result.data.tag
      setTags((prev) => [...prev, createdTag])
      return createdTag
    }

    toast({
      variant: 'destructive',
      title: 'Tag creation failed',
      description: result?.error || 'Could not create tag',
    })
    return null
  }

  const selectedCategory = categories.find((cat) => cat.id === categoryId)
  const previewCategorySlug = selectedCategory?.slug || 'news'
  const contentLabels = {
    article: {
      name: 'Article',
      description: 'Long-form or evergreen content with the standard writing editor.',
      action: 'Write and publish an article',
      title: 'Article Title',
      slug: 'article-slug',
      excerpt: 'Brief summary of the article...',
      content: 'Content',
      preview: 'Article Preview',
    },
    news: {
      name: 'News',
      description: 'Fast news publishing with the same SEO controls and lightweight workflow.',
      action: 'Write and publish a news story',
      title: 'News Title',
      slug: 'news-story-slug',
      excerpt: 'Brief summary of the news story...',
      content: 'News Content',
      preview: 'News Preview',
    },
  }
  const activeContent = contentLabels[contentType]

  if (initializing) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Loading editor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create New Content</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">{activeContent.action}</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Content Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="article">Article</SelectItem>
                <SelectItem value="news">News</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activeContent.description}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Web stories are created separately in{' '}
              <Link href="/dashboard/web-stories/new" className="font-medium text-primary hover:underline">
                Web Stories Editor
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        <ArticlePublishingChecklist
          contentType={contentType}
          userRole={userRole}
          seoTitle={seoTitle}
          seoDescription={seoDescription}
          featuredImageAlt={featuredImageAlt}
        />

        <>
            {/* Title */}
            <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              <RequiredLabel>{activeContent.title}</RequiredLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder={`Enter ${activeContent.name.toLowerCase()} title...`}
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="text-lg"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              This is required for every draft, review submission, and published story.
            </p>
          </CardContent>
            </Card>

        {/* Slug */}
            <Card>
          <CardHeader>
            <CardTitle className="text-lg">URL Slug</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Input
                placeholder={activeContent.slug}
                value={slug}
                onChange={(e) => setSlug(createSlug(e.target.value))}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Preview: <span className="font-mono text-blue-600">/{previewCategorySlug}/{slug || 'article-slug'}</span>
              </p>
            </div>
          </CardContent>
            </Card>

        {/* Excerpt */}
            <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              <RequiredLabel>Excerpt</RequiredLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder={activeContent.excerpt}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Required before review or publish. Keep it clear and summary-focused.
            </p>
          </CardContent>
            </Card>

        {/* Category and Author */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                <RequiredLabel>Category</RequiredLabel>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={categoryId} onValueChange={val => setCategoryId(val === 'none' ? '' : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {isFeedOnlyCategorySlug(cat.slug) ? `${cat.name} (legacy feed category)` : cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
              </Card>

              <Card>
            <CardHeader>
              <CardTitle className="text-lg">Author</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedAuthorId} onValueChange={setSelectedAuthorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select author" />
                </SelectTrigger>
                <SelectContent>
                  {authors.map(author => (
                    <SelectItem key={author.id} value={author.id}>
                      {author.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
              </Card>
            </div>

        {/* Featured Image */}
            <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              <RequiredLabel>Featured Image</RequiredLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) {
                  const url = await handleImageUpload(file)
                  if (url) {
                    setFeaturedImage(url)
                    if (!featuredImageAlt && title) {
                      setFeaturedImageAlt(title)
                    }
                  }
                }
              }}
            />
            <div className="mt-4">
              <Label>
                <RequiredLabel>Alt Text</RequiredLabel>
              </Label>
              <Input
                value={featuredImageAlt}
                onChange={(e) => setFeaturedImageAlt(e.target.value)}
                placeholder="Describe the image for accessibility and SEO"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Use the uploader so the image is registered in the media library before review or publish.
            </p>
          </CardContent>
            </Card>

        {/* Featured Image Preview */}
            {featuredImage && (
              <Card>
                <CardContent className="pt-6">
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                    <Image
                      src={featuredImage}
                      alt={featuredImageAlt || title || 'Featured image'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 896px"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

        {/* Tags */}
            <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <TagInput
              tags={tags}
              value={selectedTags}
              onChange={setSelectedTags}
              onCreateTag={createTag}
              description="Type a tag and press Enter to add it. Both admins and authors can create missing tags here."
            />
          </CardContent>
            </Card>

        {/* Content Editor */}
            <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              <RequiredLabel>{activeContent.content}</RequiredLabel>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TipTapEditor
              content={content.html}
              onChange={setContent}
              onImageUpload={handleImageUpload}
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              The body content is required before you can move beyond draft.
            </p>
          </CardContent>
            </Card>

        {/* SEO Fields */}
            <Card>
          <CardHeader>
            <CardTitle className="text-lg">SEO Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>
                <RequiredLabel>SEO Title</RequiredLabel>
              </Label>
              <Input
                placeholder={title || 'SEO title...'}
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
              />
              <p className={getSeoCounterClassName(seoTitle.length, 50, 60)}>
                {seoTitle.length} / 60 characters
              </p>
            </div>
            <div>
              <Label>
                <RequiredLabel>SEO Description</RequiredLabel>
              </Label>
              <Textarea
                placeholder={excerpt || 'SEO description...'}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                rows={2}
                className="resize-none"
              />
              <p className={getSeoCounterClassName(seoDescription.length, 150, 160)}>
                {seoDescription.length} / 160 characters
              </p>
            </div>
            <div>
              <Label>Social Share Image (OG)</Label>
              <Input
                placeholder="Leave blank to use featured image"
                value={ogImage}
                onChange={(e) => setOgImage(e.target.value)}
              />
            </div>
            <div>
              <Label>Canonical URL</Label>
              <Input
                placeholder="https://ekahnews.com/category/article-slug"
                value={canonicalUrl}
                onChange={(e) => setCanonicalUrl(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to use the article URL automatically. Only production-domain canonicals are allowed.
              </p>
            </div>
            <div>
              <Label>Primary Schema Type</Label>
              <Select value={schemaType} onValueChange={setSchemaType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NewsArticle">NewsArticle</SelectItem>
                  <SelectItem value="BlogPosting">BlogPosting</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Structured Data Override (JSON)</Label>
              <Textarea
                placeholder='{"@context":"https://schema.org","@type":"NewsArticle"}'
                value={structuredData}
                onChange={(e) => setStructuredData(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional. If provided, this JSON replaces the generated primary article schema.
              </p>
            </div>
            <KeywordInput
              value={keywords}
              onChange={setKeywords}
            />
          </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Publishing Controls</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Publish Date</Label>
                  <Input
                    type="datetime-local"
                    value={publishDate}
                    onChange={(e) => setPublishDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Updated Date</Label>
                  <Input
                    type="datetime-local"
                    value={updatedDate}
                    onChange={(e) => setUpdatedDate(e.target.value)}
                  />
                </div>
              </CardContent>
              <div className="px-6 pb-6 text-xs text-gray-500 dark:text-gray-400">
                Fields marked with <span className="font-semibold text-red-600 dark:text-red-400">*</span> are required before review or publish.
              </div>
            </Card>

        {/* Status (Admin only) */}
            {userRole === 'admin' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending Review</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-2">
                    {status === 'published' ? 'This content will be immediately published' : 'This content will not be publicly visible'}
                  </p>
                </CardContent>
              </Card>
            )}

        {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 sticky bottom-4 bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800 shadow-lg">
              <Button
                variant="outline"
                onClick={() => setShowPreview(true)}
                disabled={loading || !title || !content.html}
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>

              {userRole === 'admin' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => savArticle('draft')}
                    disabled={loading}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </Button>
                  <Button
                    onClick={() => savArticle('pending')}
                    disabled={loading}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Submit for Review
                  </Button>
                </>
              )}

              <Button
                onClick={() => savArticle('published')}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {loading ? 'Saving...' : userRole === 'author' ? 'Submit For Review' : 'Publish'}
              </Button>
            </div>

            {/* Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{activeContent.preview}</DialogTitle>
                  <DialogDescription className="sr-only">
                    Preview how this {contentType === 'news' ? 'news story' : contentType} will appear before saving.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {featuredImage && (
                    <div className="relative h-64 w-full overflow-hidden rounded-lg">
                      <Image
                        src={featuredImage}
                        alt={title || 'Preview image'}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 896px"
                      />
                    </div>
                  )}
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{title}</h1>
                  <p className="text-xl text-gray-600 dark:text-gray-400">{excerpt}</p>
                  <SafeHtmlPreview
                    html={content.html}
                    className="prose dark:prose-invert max-w-none"
                    baseUrl={process.env.NEXT_PUBLIC_BASE_URL || 'https://www.ekahnews.com'}
                  />
                </div>
              </DialogContent>
            </Dialog>
        </>
      </div>
    </div>
  )
}
