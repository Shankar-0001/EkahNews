import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { apiResponse } from '@/lib/api-utils'

// DELETE - Delete all tags for an article
export async function DELETE(request, { params }) {
    try {
        const supabase = await createClient()
        const admin = createAdminClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return apiResponse(401, null, 'Unauthorized')
        }

        const { id: articleId } = params

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

            if (article.author_id !== authorData?.id) {
                return apiResponse(403, null, 'You do not have permission to delete tags for this article')
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

