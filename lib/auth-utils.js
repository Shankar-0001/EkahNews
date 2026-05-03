/**
 * Authentication & Authorization Utilities
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export class AuthError extends Error {
    constructor(message) {
        super(message)
        this.name = 'AuthError'
    }
}

async function getSessionUser() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        return null
    }

    return user
}

async function getUserRole(userId) {
    const admin = createAdminClient()
    const { data: userRecord } = await admin
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

    return userRecord?.role || null
}

/**
 * Get current user from session
 * Returns: { userId, email, role } or null if not authenticated
 */
export async function getAuthUser() {
    const user = await getSessionUser()
    if (!user) {
        return null
    }

    return {
        userId: user.id,
        email: user.email,
        role: await getUserRole(user.id),
    }
}

export async function requireAuth() {
    const user = await getAuthUser()
    if (!user || !user.role) {
        throw new AuthError('Unauthorized')
    }
    return user
}

function getBearerToken(request) {
    const authHeader = request?.headers?.get?.('authorization') || request?.headers?.get?.('Authorization')
    if (!authHeader) return null

    const match = authHeader.match(/^Bearer\s+(.+)$/i)
    return match?.[1] || null
}

export async function getRequestAuthUser(request) {
    const sessionUser = await getAuthUser()
    if (sessionUser) {
        return sessionUser
    }

    const token = getBearerToken(request)
    if (!token) {
        return null
    }

    try {
        const admin = createAdminClient()
        const { data, error } = await admin.auth.getUser(token)

        if (error || !data?.user) {
            return null
        }

        return {
            userId: data.user.id,
            email: data.user.email,
            role: await getUserRole(data.user.id),
        }
    } catch {
        return null
    }
}

export async function requireRequestAuth(request) {
    const user = await getRequestAuthUser(request)
    if (!user || !user.role) {
        throw new AuthError('Unauthorized')
    }
    return user
}

export async function requireAdmin(request = null) {
    const user = request ? await requireRequestAuth(request) : await requireAuth()
    if (user.role !== 'admin') {
        throw new AuthError('Forbidden: Admin role required')
    }
    return user
}

export async function getUserAuthorId(userId) {
    const admin = createAdminClient()
    const { data: author } = await admin
        .from('authors')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

    return author?.id || null
}

export async function isArticleOwner(articleId, userId) {
    const admin = createAdminClient()
    const { data: article } = await admin
        .from('articles')
        .select('author_id')
        .eq('id', articleId)
        .maybeSingle()

    if (!article) return false

    const authorId = await getUserAuthorId(userId)
    return article.author_id === authorId
}

export async function canEditArticle(articleId, user) {
    if (user.role === 'admin') return true
    return await isArticleOwner(articleId, user.userId)
}

export async function canDeleteArticle(articleId, user) {
    if (user.role === 'admin') return true
    return await isArticleOwner(articleId, user.userId)
}

export async function withAuth(request, handler) {
    try {
        const user = request ? await requireRequestAuth(request) : await requireAuth()
        return await handler(user)
    } catch (error) {
        if (error instanceof AuthError) {
            return new Response(JSON.stringify({ error: error.message }), { status: 401 })
        }
        throw error
    }
}

export async function canDeleteUserMedia(userId, mediaId) {
    const admin = createAdminClient()
    const { data: media } = await admin
        .from('media_library')
        .select('uploaded_by')
        .eq('id', mediaId)
        .maybeSingle()

    if (!media) return false

    const { data: user } = await admin
        .from('users')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

    if (user?.role === 'admin') return true
    return media.uploaded_by === userId
}

export async function withAdmin(request, handler) {
    try {
        const user = await requireAdmin(request)
        return await handler(user)
    } catch (error) {
        if (error instanceof AuthError) {
            const status = error.message.includes('Admin') ? 403 : 401
            return new Response(JSON.stringify({ error: error.message }), { status })
        }
        throw error
    }
}
