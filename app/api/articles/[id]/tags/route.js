import { createAdminClient } from '@/lib/supabase/admin'
import { apiResponse } from '@/lib/api-utils'
import { requireRequestAuth } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'

// DELETE - Delete all tags for an article
export async function DELETE(request, { params }) {
    try {
        const user = await requireRequestAuth(request)
        const admin = createAdminClient()

        const { id: articleId } = params

        if (!articleId) {
            return apiResponse(400, null, 'Article ID is required')
        }

        const { data: article, error: articleError } = await admin
            .from('articles')
            .select('author_id, slug, categories(slug)')
            .eq('id', articleId)
            .single()

        if (articleError || !article) {
            return apiResponse(404, null, 'Article not found')
        }

        const { data: userData } = await admin
            .from('users')
            .select('role')
            .eq('id', user.userId)
            .single()

        const isAdmin = userData?.role === 'admin'

        if (!isAdmin) {
            const { data: authorData } = await admin
                .from('authors')
                .select('id')
                .eq('user_id', user.userId)
                .single()

            if (article.author_id !== authorData?.id) {
                return apiResponse(403, null, 'You do not have permission to delete tags for this article')
            }
        }

        const { data: existingTags } = await admin
            .from('article_tags')
            .select('tags(slug)')
            .eq('article_id', articleId)

        const { error } = await admin
            .from('article_tags')
            .delete()
            .eq('article_id', articleId)

        if (error) {
            return apiResponse(500, null, error.message)
        }

        revalidatePath('/sitemap.xml')
        if (article?.slug) {
            revalidatePath(`/${article.categories?.slug || 'news'}/${article.slug}`)
        }
        for (const entry of existingTags || []) {
            if (entry?.tags?.slug) {
                revalidatePath(`/tags/${entry.tags.slug}`)
            }
        }

        return apiResponse(200, { deleted: true }, null)
    } catch (error) {
        console.error('[API] Error deleting article tags:', error)
        return apiResponse(500, null, 'An internal error occurred')
    }
}
