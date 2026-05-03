'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ArrowLeft, Upload } from 'lucide-react'
import Link from 'next/link'
import { createSlug } from '@/lib/slug'

function normalizeExternalUrl(url) {
    const value = url?.trim()
    if (!value) return ''
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return value
    return `https://${value}`
}

export default function EditAuthorPage() {
    const router = useRouter()
    const params = useParams()
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [author, setAuthor] = useState(null)

    // Form state
    const [name, setName] = useState('')
    const [slug, setSlug] = useState('')
    const [email, setEmail] = useState('')
    const [bio, setBio] = useState('')
    const [expertise, setExpertise] = useState('')
    const [credentials, setCredentials] = useState('')
    const [beat, setBeat] = useState('')
    const [title, setTitle] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [socialLinks, setSocialLinks] = useState({
        twitter: '',
        linkedin: '',
        website: '',
    })

    useEffect(() => {
        loadAuthor()
    }, [params.id])

    const loadAuthor = async () => {
        try {
            const response = await fetch(`/api/authors?id=${params.id}`)
            const result = await response.json()
            if (!response.ok) {
                throw new Error(result?.error || 'Failed to load author')
            }
            const data = result?.data?.author

            if (data) {
                setAuthor(data)
                setName(data.name || '')
                setSlug(data.slug || '')
                setEmail(data.email || '')
                setBio(data.bio || '')
                setExpertise(data.social_links?.expertise || '')
                setCredentials(data.social_links?.credentials || '')
                setBeat(data.social_links?.beat || '')
                setTitle(data.title || '')
                setAvatarUrl(data.avatar_url || '')
                setSocialLinks({
                    twitter: data.social_links?.twitter || '',
                    linkedin: data.social_links?.linkedin || '',
                    website: data.social_links?.website || '',
                })
            }
        } catch (error) {
            console.error('Error loading author:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleNameChange = (newName) => {
        setName(newName)
        if (!slug || slug === createSlug(author?.name || '')) {
            setSlug(createSlug(newName))
        }
    }

    const handleAvatarUpload = async (file) => {
        if (!file) return

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
        } catch (error) {
            console.error('Upload error:', error)
            alert('Failed to upload avatar')
        }
    }

    const saveAuthor = async () => {
        if (!name) {
            alert('Author name is required')
            return
        }

        setSaving(true)

        try {
            const authorData = {
                id: params.id,
                name,
                slug,
                email: email || null,
                bio: bio || null,
                expertise: expertise.trim() || null,
                credentials: credentials.trim() || null,
                beat: beat.trim() || null,
                title: title || null,
                avatar_url: avatarUrl || null,
                social_links: {
                    twitter: normalizeExternalUrl(socialLinks.twitter),
                    linkedin: normalizeExternalUrl(socialLinks.linkedin),
                    website: normalizeExternalUrl(socialLinks.website),
                },
            }

            // Use API proxy instead of direct Supabase client
            const response = await fetch('/api/authors', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(authorData),
            })

            const result = await response.json()
            if (!response.ok) {
                throw new Error(result.error || 'Failed to update author')
            }

            alert('Author updated successfully!')
            router.push('/dashboard/authors')
        } catch (error) {
            console.error('Error saving author:', error)
            alert('Failed to save author: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="p-8">
                <p className="text-gray-500">Loading...</p>
            </div>
        )
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="mb-8">
                <Link href="/dashboard/authors">
                    <Button variant="ghost" className="mb-4">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Authors
                    </Button>
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Edit Author</h1>
            </div>

            <div className="space-y-6">
                {/* Avatar */}
                <Card>
                    <CardHeader>
                        <CardTitle>Author Avatar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-start gap-6">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={avatarUrl} />
                                <AvatarFallback>
                                    {name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
                                    className="mb-2"
                                />
                                <p className="text-xs text-gray-500">JPG, PNG up to 5MB</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Basic Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Full Name *</Label>
                            <Input
                                value={name}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="Enter author name"
                            />
                        </div>
                        <div>
                            <Label>Slug</Label>
                            <Input
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                placeholder="author-slug"
                            />
                        </div>
                        <div>
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="author@example.com"
                            />
                        </div>
                        <div>
                            <Label>Professional Title</Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Senior Journalist"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Bio */}
                <Card>
                    <CardHeader>
                        <CardTitle>Bio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Write a brief bio about this author..."
                            className="min-h-[120px]"
                        />
                        <div className="mt-4 space-y-4">
                            <div>
                                <Label>Expertise</Label>
                                <Input
                                    value={expertise}
                                    onChange={(e) => setExpertise(e.target.value)}
                                    placeholder="e.g. Technology, AI, Startups"
                                />
                            </div>
                            <div>
                                <Label>Credentials</Label>
                                <Input
                                    value={credentials}
                                    onChange={(e) => setCredentials(e.target.value)}
                                    placeholder="e.g. 10 years in journalism, MBA from IIM"
                                />
                            </div>
                            <div>
                                <Label>Beat / Coverage Areas</Label>
                                <Input
                                    value={beat}
                                    onChange={(e) => setBeat(e.target.value)}
                                    placeholder="e.g. Business, Politics, Sports"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Social Links */}
                <Card>
                    <CardHeader>
                        <CardTitle>Social Links</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Twitter</Label>
                            <Input
                                value={socialLinks.twitter}
                                onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                                placeholder="https://twitter.com/username"
                            />
                        </div>
                        <div>
                            <Label>LinkedIn</Label>
                            <Input
                                value={socialLinks.linkedin}
                                onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                                placeholder="https://linkedin.com/in/username"
                            />
                        </div>
                        <div>
                            <Label>Website</Label>
                            <Input
                                value={socialLinks.website}
                                onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
                                placeholder="https://example.com"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-4">
                    <Button onClick={saveAuthor} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Author'}
                    </Button>
                    <Link href="/dashboard/authors">
                        <Button variant="outline">Cancel</Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
