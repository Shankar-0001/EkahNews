import { createAdminClient } from '@/lib/supabase/admin'
import { assertDeploymentTarget } from '@/lib/atomic-article.mjs'
import { UUID } from '@/lib/navigation-model.mjs'
import { apiResponse } from '@/lib/api-utils'
import { requireRequestAuth, canEditArticle } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'

export async function POST(request) {
    try {
        assertDeploymentTarget()
        const relations = await request.json()
        const user = await requireRequestAuth(request)
        const supabase = createAdminClient()
        if (!Array.isArray(relations) || relations.length === 0 || relations.length > 100 || relations.some(r => !UUID.test(r?.article_id || '') || !UUID.test(r?.tag_id || ''))) {
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
            .insert(relations.map(({article_id,tag_id}) => ({article_id,tag_id})))
        if (error) {
            return apiResponse(400, null, error.message)
        }

        const tagIds = [...new Set(relations.map((relation) => relation?.tag_id).filter(Boolean))]
        const [{ data: article }, { data: tags }] = await Promise.all([
            supabase
                .from('articles')
                .select('slug, categories:categories!articles_category_id_fkey(slug)')
                .eq('id', articleIds[0])
                .maybeSingle(),
            tagIds.length > 0
                ? supabase
                    .from('tags')
                    .select('slug')
                    .in('id', tagIds)
                : Promise.resolve({ data: [] }),
        ])

        revalidatePath('/sitemap.xml')
        if (article?.slug) {
            revalidatePath(`/${article.categories?.slug || 'news'}/${article.slug}`)
        }
        for (const tag of tags || []) {
            if (tag?.slug) {
                revalidatePath(`/tags/${tag.slug}`)
            }
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
