import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiResponse } from '@/lib/api-utils'
import { requireAdmin } from '@/lib/auth-utils'
import { validateTag } from '@/lib/validation'

// POST - Create article tag relationships
export async function POST(request) {
    try {
        const supabase = await createClient()
        const admin = createAdminClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return apiResponse(401, null, 'Unauthorized')
        }

        const tagRelations = await request.json()

        if (!Array.isArray(tagRelations) || tagRelations.length === 0) {
            return apiResponse(400, null, 'Tag relations must be a non-empty array')
        }

        const valid = tagRelations.every((rel) => rel.article_id && rel.tag_id)
        if (!valid) {
            return apiResponse(400, null, 'Each tag relation must have article_id and tag_id')
        }

        const articleIds = [...new Set(tagRelations.map((rel) => rel.article_id))]
        if (articleIds.length !== 1) {
            return apiResponse(400, null, 'All tag relations must target one article')
        }
        const articleId = articleIds[0]

        const { data: article, error: articleError } = await admin
            .from('articles')
            .select('author_id')
            .eq('id', articleId)
            .single()

        if (articleError || !article) {
            return apiResponse(404, null, 'Article not found')
        }

        const { data: userData } = await admin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        const isAdmin = userData?.role === 'admin'

        if (!isAdmin) {
            const { data: authorData } = await admin
                .from('authors')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (!authorData || authorData.id !== article.author_id) {
                return apiResponse(403, null, 'Forbidden: Cannot modify tags for this article')
            }
        }

        const { error: deleteError } = await admin
            .from('article_tags')
            .delete()
            .eq('article_id', articleId)

        if (deleteError) {
            return apiResponse(500, null, deleteError.message)
        }

        const { data, error } = await admin
            .from('article_tags')
            .insert(tagRelations)
            .select('article_id, tag_id')

        if (error) {
            return apiResponse(500, null, error.message)
        }

        return apiResponse(201, { relations: data }, null)
    } catch (error) {
        console.error('[API] Error creating article tags:', error)
        return apiResponse(500, null, error.message)
    }
}

// DELETE - Delete article tag relationship
export async function DELETE(request) {
    try {
        const supabase = await createClient()
        const admin = createAdminClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return apiResponse(401, null, 'Unauthorized')
        }

        const { articleId } = await request.json()

        if (!articleId) {
            return apiResponse(400, null, 'Article ID is required')
        }

        const { data: article, error: articleError } = await admin
            .from('articles')
            .select('author_id')
            .eq('id', articleId)
            .single()

        if (articleError || !article) {
            return apiResponse(404, null, 'Article not found')
        }

        const { data: userData } = await admin
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        const isAdmin = userData?.role === 'admin'

        if (!isAdmin) {
            const { data: authorData } = await admin
                .from('authors')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (!authorData || authorData.id !== article.author_id) {
                return apiResponse(403, null, 'Forbidden: Cannot modify tags for this article')
            }
        }

        const { error } = await admin
            .from('article_tags')
            .delete()
            .eq('article_id', articleId)

        if (error) {
            return apiResponse(500, null, error.message)
        }

        return apiResponse(200, { deleted: true }, null)
    } catch (error) {
        console.error('[API] Error deleting article tags:', error)
        return apiResponse(500, null, error.message)
    }
}

// PUT - Create tag
export async function PUT(request) {
    try {
        await requireAdmin()
        const admin = createAdminClient()

        const { name, slug } = await request.json()
        validateTag({ name, slug })
        if (!name || !slug) {
            return apiResponse(400, null, 'Name and slug are required')
        }

        const { data: existing } = await admin
            .from('tags')
            .select('id, name, slug')
            .eq('slug', slug)
            .maybeSingle()

        if (existing) {
            return apiResponse(200, { tag: existing }, null)
        }

        const { data: tag, error } = await admin
            .from('tags')
            .insert({ name, slug })
            .select('id, name, slug')
            .single()

        if (error) {
            return apiResponse(500, null, error.message)
        }

        return apiResponse(201, { tag }, null)
    } catch (error) {
        if (error.name === 'ValidationError') {
            return apiResponse(422, null, error.fields?.name || error.message)
        }
        if (error.name === 'AuthError') {
            return apiResponse(error.message.includes('Admin') ? 403 : 401, null, error.message)
        }
        console.error('[API] Error creating tag:', error)
        return apiResponse(500, null, error.message)
    }
}

