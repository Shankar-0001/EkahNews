import { SITE_URL } from '@/lib/site-config'

/**
 * Input Validation Utilities - Simple but powerful validation
 */

export class ValidationError extends Error {
    constructor(message, fields = {}) {
        super(message)
        this.fields = fields
        this.name = 'ValidationError'
    }
}

/**
 * Article validation schema
 */
export const validateArticle = (data) => {
    const errors = {}

    if (!data.title?.trim()) {
        errors.title = 'Title is required'
    } else if (data.title.length < 5) {
        errors.title = 'Title must be at least 5 characters'
    } else if (data.title.length > 200) {
        errors.title = 'Title must be less than 200 characters'
    }

    if (!data.slug?.trim()) {
        errors.slug = 'Slug is required'
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
        errors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens'
    }

    if (data.excerpt && data.excerpt.length > 500) {
        errors.excerpt = 'Excerpt must be less than 500 characters'
    }

    if (!data.content?.trim()) {
        errors.content = 'Content is required'
    }

    if (data.keywords !== undefined) {
        if (!Array.isArray(data.keywords)) {
            errors.keywords = 'Keywords must be an array'
        } else if (data.keywords.length > 10) {
            errors.keywords = 'You can add up to 10 keywords'
        } else if (data.keywords.some((keyword) => typeof keyword !== 'string' || keyword.trim().length < 2 || keyword.trim().length > 60)) {
            errors.keywords = 'Each keyword must be between 2 and 60 characters'
        }
    }

    if (data.featured_image_url && !data.featured_image_alt?.trim()) {
        errors.featured_image_alt = 'Featured image alt text is required when a featured image is set'
    }

    if (data.seo_title && data.seo_title.length > 110) {
        errors.seo_title = 'SEO title must be less than 110 characters'
    }

    if (data.seo_description && data.seo_description.length > 200) {
        errors.seo_description = 'SEO description must be less than 200 characters'
    }

    if (data.canonical_url) {
        try {
            const parsed = new URL(data.canonical_url, SITE_URL)
            const siteOrigin = new URL(SITE_URL).origin
            if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== siteOrigin) {
                errors.canonical_url = 'Canonical URL must use the production site domain'
            }
        } catch {
            errors.canonical_url = 'Canonical URL must be a valid absolute or site-relative URL'
        }
    }

    if (data.schema_type && !['NewsArticle', 'BlogPosting'].includes(data.schema_type)) {
        errors.schema_type = 'Schema type must be NewsArticle or BlogPosting'
    }

    if (data.structured_data !== undefined && data.structured_data !== null && data.structured_data !== '') {
        try {
            const parsed = typeof data.structured_data === 'string'
                ? JSON.parse(data.structured_data)
                : data.structured_data
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                errors.structured_data = 'Structured data override must be a valid JSON object'
            } else {
                const allowedTypes = new Set(['NewsArticle', 'BlogPosting'])
                if (parsed['@context'] && parsed['@context'] !== 'https://schema.org') {
                    errors.structured_data = 'Structured data override must use https://schema.org as @context'
                }
                if (!allowedTypes.has(parsed['@type'])) {
                    errors.structured_data = 'Structured data override must use NewsArticle or BlogPosting as @type'
                }
            }
        } catch {
            errors.structured_data = 'Structured data override must be valid JSON'
        }
    }

    if (data.published_at && Number.isNaN(new Date(data.published_at).getTime())) {
        errors.published_at = 'Publish date must be a valid date-time'
    }

    if (data.updated_at && Number.isNaN(new Date(data.updated_at).getTime())) {
        errors.updated_at = 'Updated date must be a valid date-time'
    }

    if (data.status && !['draft', 'pending', 'published', 'archived'].includes(data.status)) {
        errors.status = 'Invalid status'
    }

    if (Object.keys(errors).length > 0) {
        throw new ValidationError('Article validation failed', errors)
    }

    return true
}

/**
 * Author validation schema
 */
export const validateAuthor = (data) => {
    const errors = {}

    if (!data.name?.trim()) {
        errors.name = 'Name is required'
    } else if (data.name.length < 2) {
        errors.name = 'Name must be at least 2 characters'
    } else if (data.name.length > 100) {
        errors.name = 'Name must be less than 100 characters'
    }

    if (!data.slug?.trim()) {
        errors.slug = 'Slug is required'
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.email = 'Invalid email format'
    }

    if (data.bio && data.bio.length > 1000) {
        errors.bio = 'Bio must be less than 1000 characters'
    }

    if (Object.keys(errors).length > 0) {
        throw new ValidationError('Author validation failed', errors)
    }

    return true
}

/**
 * Category validation schema
 */
export const validateCategory = (data) => {
    const errors = {}

    if (!data.name?.trim()) {
        errors.name = 'Name is required'
    } else if (data.name.length < 2 || data.name.length > 50) {
        errors.name = 'Name must be between 2 and 50 characters'
    }

    if (!data.slug?.trim()) {
        errors.slug = 'Slug is required'
    }

    if (Object.keys(errors).length > 0) {
        throw new ValidationError('Category validation failed', errors)
    }

    return true
}

/**
 * Tag validation schema
 */
export const validateTag = (data) => {
    const errors = {}

    if (!data.name?.trim()) {
        errors.name = 'Name is required'
    } else if (data.name.length < 2 || data.name.length > 30) {
        errors.name = 'Name must be between 2 and 30 characters'
    }

    if (!data.slug?.trim()) {
        errors.slug = 'Slug is required'
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
        errors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens'
    }

    if (Object.keys(errors).length > 0) {
        throw new ValidationError('Tag validation failed', errors)
    }

    return true
}

/**
 * File upload validation
 */
export const validateFileUpload = (file, maxSizeMB = 5, allowedTypes = ['image/jpeg', 'image/png', 'image/webp']) => {
    const errors = []

    if (!file) {
        errors.push('File is required')
    } else {
        const maxBytes = maxSizeMB * 1024 * 1024
        if (file.size > maxBytes) {
            errors.push(`File size must be less than ${maxSizeMB}MB`)
        }

        if (!allowedTypes.includes(file.type)) {
            errors.push(`File type must be one of: ${allowedTypes.join(', ')}`)
        }
    }

    if (errors.length > 0) {
        throw new ValidationError(errors.join('; '), { file: errors })
    }

    return true
}
