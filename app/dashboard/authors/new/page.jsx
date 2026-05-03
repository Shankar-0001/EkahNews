'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createSlug } from '@/lib/slug'
import Image from 'next/image'

function normalizeExternalUrl(url) {
    const value = url?.trim()
    if (!value) return ''
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return value
    return `https://${value}`
}

export default function NewAuthorPage() {
    const router = useRouter()
    const supabase = createClient()
    const [saving, setSaving] = useState(false)

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
    const [errorMessage, setErrorMessage] = useState('')
    const [socialLinks, setSocialLinks] = useState({
        twitter: '',
        linkedin: '',
        website: '',
    })

    const handleNameChange = (newName) => {
        setName(newName)
        if (!slug) {
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
            setErrorMessage('')
            alert('Author name is required')
            return
        }

        if (!email) {
            setErrorMessage('')
            alert('Author email is required')
            return
        }

        setSaving(true)
        setErrorMessage('')

        try {
            const authorData = {
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
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(authorData),
            })

            const result = await response.json()
            if (!response.ok) {
                const fieldMessage = result?.data?.fields
                    ? Object.values(result.data.fields).find(Boolean)
                    : ''
                const message = fieldMessage || result?.error || 'Failed to create author'
                if (response.status === 409) {
                    setErrorMessage('This user already has an author profile.')
                } else {
                    setErrorMessage(message)
                }
                throw new Error(message)
            }

            alert('Author created successfully!')
            router.push('/dashboard/authors')
        } catch (error) {
            console.error('Error creating author:', error)
            if (error.message !== 'An author profile already exists for this user') {
                alert('Failed to create author: ' + error.message)
            }
        } finally {
            setSaving(false)
        }
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
                <h1 className="text-3xl font-bold text-gray-900">Create New Author</h1>
            </div>

            <div className="space-y-6">
                {errorMessage && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {errorMessage}
                    </div>
                )}

                {/* Avatar */}
                <Card>
                    <CardHeader>
                        <CardTitle>Author Avatar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div>
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
                                className="mb-2"
                            />
                            <p className="text-xs text-gray-500">JPG, PNG up to 5MB</p>
                            {avatarUrl && (
                                <div className="mt-4">
                                    <div className="relative h-20 w-20 overflow-hidden rounded-full">
                                      <Image
                                        src={avatarUrl}
                                        alt="Avatar preview"
                                        fill
                                        className="object-cover"
                                        sizes="80px"
                                      />
                                    </div>
                                </div>
                            )}
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
                            <Label>Email *</Label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="author@example.com"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">This email is used to link or invite the author account.</p>
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
                        {saving ? 'Creating...' : 'Create Author'}
                    </Button>
                    <Link href="/dashboard/authors">
                        <Button variant="outline">Cancel</Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
