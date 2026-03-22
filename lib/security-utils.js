import { sanitizeStoredHtml } from '@/lib/html-sanitizer'

/**
 * Input Sanitization Utilities
 * Prevents XSS and injection attacks
 */

/**
 * Sanitize HTML content (for editor output)
 */
export const sanitizeHTML = (html) => {
    return sanitizeRichText(html)
}

/**
 * Server-safe rich text sanitization for stored article content.
 */
export const sanitizeRichText = (html) => {
    return sanitizeStoredHtml(html)
}

/**
 * Sanitize text input (removes all HTML)
 */
export const sanitizeText = (text) => {
    if (!text) return ''

    // Remove any HTML tags
    return text.replace(/<[^>]*>/g, '')
}

/**
 * Sanitize URL to prevent javascript: and data: URLs
 */
export const sanitizeURL = (url) => {
    if (!url) return ''

    try {
        const parsed = new URL(url)
        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return ''
        }
        return url
    } catch {
        // If URL parsing fails, treat as relative path
        if (url.startsWith('/')) {
            return url
        }
        return ''
    }
}

/**
 * Escape HTML entities to prevent XSS
 */
export const escapeHTML = (text) => {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    }
    return text.replace(/[&<>"']/g, (m) => map[m])
}

/**
 * Validate email format
 */
export const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
}

/**
 * Validate URL format
 */
export const validateURL = (url) => {
    try {
        new URL(url)
        return true
    } catch {
        return false
    }
}

/**
 * Remove potentially dangerous attributes
 */
export const removeScriptAttributes = (html) => {
    return sanitizeStoredHtml(html)
}

/**
 * Validate file upload
 */
export const validateFileUpload = (file, allowedMimesOrOptions = [], maxSize = 5 * 1024 * 1024) => {
    const errors = []
    const options = Array.isArray(allowedMimesOrOptions)
        ? { allowedTypes: allowedMimesOrOptions, maxSize }
        : {
            allowedTypes: allowedMimesOrOptions.allowedTypes || [],
            maxSize: allowedMimesOrOptions.maxSize || maxSize,
        }

    if (!file) {
        return { valid: false, errors: ['No file provided'] }
    }

    if (options.allowedTypes.length > 0 && !options.allowedTypes.includes(file.type)) {
        errors.push(`File type not allowed. Allowed types: ${options.allowedTypes.join(', ')}`)
    }

    if (file.size > options.maxSize) {
        errors.push(`File size must be less than ${options.maxSize / 1024 / 1024}MB`)
    }

    return {
        valid: errors.length === 0,
        errors,
    }
}

/**
 * Normalize uploaded file names for safe storage paths.
 */
export const sanitizeFilename = (filename) => {
    if (!filename) return 'file'

    const trimmed = filename.trim().toLowerCase()
    const cleaned = trimmed
        .replace(/[^a-z0-9.\-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')

    return cleaned || 'file'
}

/**
 * Slugify text safely
 */
export const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
}

/**
 * Sanitize object data (for API requests)
 */
export const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') {
        return obj
    }

    const sanitized = {}

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeText(value)
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value)
        } else {
            sanitized[key] = value
        }
    }

    return sanitized
}

export default {
    sanitizeHTML,
    sanitizeText,
    sanitizeURL,
    escapeHTML,
    validateEmail,
    validateURL,
    removeScriptAttributes,
    sanitizeRichText,
    validateFileUpload,
    sanitizeFilename,
    slugify,
    sanitizeObject,
}
