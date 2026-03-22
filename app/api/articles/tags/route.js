import { createClient } from '@/lib/supabase/server'
import { apiResponse } from '@/lib/api-utils'
import { requireAdmin } from '@/lib/auth-utils'
import { validateTag, ValidationError } from '@/lib/validation'

// POST - Create article tag relationships
export async function POST(request) {
    try {
        const supabase = await createClient()

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return apiResponse(401, null, 'Unauthorized')
        }

        const tagRelations = await request.json()

        if (!Array.isArray(tagRelations) || tagRelations.length === 0) {
            return apiResponse(400, null, 'Tag relations must be a non-empty array')
        }

        // Validate all tag relations have required fields
        const valid = tagRelations.every(rel => rel.article_id && rel.tag_id)
        if (!valid) {
            return apiResponse(400, null, 'Each tag relation must have article_id and tag_id')
        }

        const articleIds = [...new Set(tagRelations.map((rel) => rel.article_id))]
        if (articleIds.length !== 1) {
            return apiResponse(400, null, 'All tag relations must target one article')
        }
        const articleId = articleIds[0]

        // Verify user can edit this article (owner or admin)
        const { data: article, error: articleError } = await supabase
            .from('articles')
            .select('author_id')
            .eq('id', articleId)
            .single()

        if (articleError || !article) {
            return apiResponse(404, null, 'Article not found')
        }

        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        const isAdmin = userData?.role === 'admin'

        if (!isAdmin) {
            const { data: authorData } = await supabase
                .from('authors')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (!authorData || authorData.id !== article.author_id) {
                return apiResponse(403, null, 'Forbidden: Cannot modify tags for this article')
            }
        }

        // Replace tag relations
        const { error: deleteError } = await supabase
            .from('article_tags')
            .delete()
            .eq('article_id', articleId)

        if (deleteError) {
            return apiResponse(500, null, deleteError.message)
        }

        // Insert tag relations
        const { data, error } = await supabase
            .from('article_tags')
            .insert(tagRelations)
            .select('id, article_id, tag_id, created_at')

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

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return apiResponse(401, null, 'Unauthorized')
        }

        const { articleId } = await request.json()

        if (!articleId) {
            return apiResponse(400, null, 'Article ID is required')
        }

        // Verify user can edit this article (owner or admin)
        const { data: article, error: articleError } = await supabase
            .from('articles')
            .select('author_id')
            .eq('id', articleId)
            .single()

        if (articleError || !article) {
            return apiResponse(404, null, 'Article not found')
        }

        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        const isAdmin = userData?.role === 'admin'

        if (!isAdmin) {
            const { data: authorData } = await supabase
                .from('authors')
                .select('id')
                .eq('user_id', user.id)
                .single()

            if (!authorData || authorData.id !== article.author_id) {
                return apiResponse(403, null, 'Forbidden: Cannot modify tags for this article')
            }
        }

        // Delete all tags for this article
        const { error } = await supabase
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
        const supabase = await createClient()

        const { name, slug } = await request.json()
        validateTag({ name, slug })
        if (!name || !slug) {
            return apiResponse(400, null, 'Name and slug are required')
        }

        const { data: existing } = await supabase
            .from('tags')
            .select('id, name, slug')
            .eq('slug', slug)
            .maybeSingle()

        if (existing) {
            return apiResponse(200, { tag: existing }, null)
        }

        const { data: tag, error } = await supabase
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
