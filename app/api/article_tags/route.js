import { createClient } from '@/lib/supabase/server'
import { apiResponse } from '@/lib/api-utils'
import { requireAuth, canEditArticle } from '@/lib/auth-utils'

export async function POST(request) {
    try {
        const relations = await request.json()
        const user = await requireAuth()
        const supabase = await createClient()
        if (!Array.isArray(relations) || relations.length === 0) {
            return apiResponse(400, null, 'Relations must be a non-empty array')
        }

        const articleIds = [...new Set(relations.map((relation) => relation?.article_id).filter(Boolean))]
        if (articleIds.length !== 1) {
            return apiResponse(400, null, 'Relations must target exactly one article')
        }

        const canEdit = await canEditArticle(articleIds[0], user)
        if (!canEdit) {
            return apiResponse(403, null, 'Forbidden: Cannot modify tags for this article')
        }

        const { error } = await supabase
            .from('article_tags')
            .insert(relations)
        if (error) {
            return apiResponse(400, null, error.message)
        }
        return apiResponse(201, { ok: true })
    } catch (err) {
        if (err.name === 'AuthError') {
            return apiResponse(401, null, err.message)
        }
        console.error('article_tags API error', err)
        return apiResponse(500, null, 'Server error')
    }
}
