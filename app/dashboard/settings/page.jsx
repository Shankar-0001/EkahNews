'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import slugify from 'slugify'
import { validateImageFile } from '@/lib/image-utils'

export default function AuthorSettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [authorId, setAuthorId] = useState(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [email, setEmail] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    loadAuthorProfile()
  }, [])

  const loadAuthorProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: author } = await supabase
        .from('authors')
        .select('id, name, slug, email, bio, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle()

      if (author?.id) {
        setAuthorId(author.id)
        setName(author.name || '')
        setSlug(author.slug || '')
        setEmail(author.email || user.email || '')
        setBio(author.bio || '')
        setAvatarUrl(author.avatar_url || '')
      } else {
        setName(user.email?.split('@')[0] || '')
        setEmail(user.email || '')
        setBio('')
        setAvatarUrl('')
      }
    } catch (error) {
      console.error('Failed to load author profile:', error)
      toast({ variant: 'destructive', title: 'Load failed', description: 'Failed to load author profile.' })
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (file) => {
    if (!file) return

    const validation = validateImageFile(file)
    if (!validation.valid) {
      toast({ variant: 'destructive', title: 'Upload failed', description: validation.errors.join(', ') })
      return
    }

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `authors/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath)

      setAvatarUrl(publicUrl)
      toast({ title: 'Avatar uploaded', description: 'Your avatar was uploaded successfully.' })
    } catch (error) {
      console.error('Upload error:', error)
      toast({ variant: 'destructive', title: 'Upload failed', description: 'Failed to upload avatar.' })
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Validation error', description: 'Name is required.' })
      return
    }

    setSaving(true)
    try {
      const nextSlug = slug || slugify(name, { lower: true, strict: true })
      const payload = {
        name: name.trim(),
        slug: nextSlug,
        email: email.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl || null,
      }

      const response = await fetch('/api/authors', {
        method: authorId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authorId ? { id: authorId, ...payload } : payload),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result?.error || 'Failed to save profile')

      if (!authorId && result?.data?.author?.id) {
        setAuthorId(result.data.author.id)
      }

      if (!slug) {
        setSlug(nextSlug)
      }

      toast({ title: 'Profile updated', description: 'Your author profile was updated successfully.' })
    } catch (error) {
      console.error('Profile update failed:', error)
      toast({ variant: 'destructive', title: 'Save failed', description: error.message || 'Failed to save profile.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Author Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Avatar</Label>
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback>
                  {name.split(' ').map((n) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
                  className="mb-2"
                />
                <p className="text-xs text-gray-500">JPG, PNG, GIF, or WebP up to your configured media limit.</p>
              </div>
            </div>
          </div>
          <div>
            <Label>Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <Label>Bio / Experience</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Share your experience and background..."
              className="min-h-[140px]"
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

