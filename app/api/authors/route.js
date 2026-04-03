import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { apiResponse, logger } from '@/lib/api-utils'
import { validateAuthor, ValidationError } from '@/lib/validation'
import { requireAuth, requireAdmin } from '@/lib/auth-utils'

function getPaging(url) {
    const search = new URL(url).searchParams
    const page = Math.max(1, Number.parseInt(search.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, Number.parseInt(search.get('limit') || '20', 10)))
    const from = (page - 1) * limit
    const to = from + limit - 1
    return { page, limit, from, to }
}

export async function GET(request) {
    const requestId = 'GET-authors'

    try {
        await requireAdmin()
        const admin = createAdminClient()
        const url = new URL(request.url)
        const authorId = url.searchParams.get('id')

        if (authorId) {
            const { data: author, error } = await admin
                .from('authors')
                .select('id, name, slug, bio, title, email, avatar_url, social_links, user_id, users(email, role)')
                .eq('id', authorId)
                .maybeSingle()

            if (error) {
                logger.error(`[${requestId}] Database error`, error)
                return apiResponse(400, null, error.message)
            }

            return apiResponse(200, { author: author || null })
        }

        const { page, limit, from, to } = getPaging(request.url)
        const { data: authors, count, error } = await admin
            .from('authors')
            .select('id, name, slug, bio, title, email, avatar_url, social_links, user_id, users(email, role)', { count: 'exact' })
            .order('name')
            .range(from, to)

        if (error) {
            logger.error(`[${requestId}] Database error`, error)
            return apiResponse(400, null, error.message)
        }

        return apiResponse(200, {
            authors: authors || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                pages: Math.ceil((count || 0) / limit),
            },
        })
    } catch (error) {
        if (error.name === 'ConfigError') {
            return apiResponse(500, null, error.message)
        }
        if (error.name === 'AuthError') {
            const status = error.message.includes('Admin') ? 403 : 401
            return apiResponse(status, null, error.message)
        }

        logger.error(requestId, error)
        return apiResponse(500, null, 'Internal server error')
    }
}

export async function POST(request) {
    const requestId = 'POST-author'

    try {
        const user = await requireAuth()
        logger.info(`[${requestId}] User authenticated`, { userId: user.userId })

        const authorData = await request.json()
        validateAuthor(authorData)

        const supabase = await createClient()
        const admin = user.role === 'admin' ? createAdminClient() : null
        let targetUserId = user.userId
        let normalizedEmail = authorData.email?.trim().toLowerCase() || null

        if (user.role === 'admin') {
            if (!normalizedEmail) {
                return apiResponse(400, null, 'Email is required when admin creates an author')
            }

            const { data: existingUser, error: userLookupError } = await admin
                .from('users')
                .select('id, email, role')
                .eq('email', normalizedEmail)
                .maybeSingle()

            if (userLookupError) {
                logger.error(`[${requestId}] User lookup error`, userLookupError)
                return apiResponse(400, null, userLookupError.message)
            }

            if (!existingUser?.id) {
                const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
                    data: {
                        name: authorData.name,
                    },
                })

                if (inviteError) {
                    logger.error(`[${requestId}] Invite error`, inviteError)
                    return apiResponse(400, null, inviteError.message)
                }

                const invitedUserId = inviteData?.user?.id
                if (!invitedUserId) {
                    return apiResponse(500, null, 'Invited user ID was not returned')
                }

                const { error: upsertUserError } = await admin
                    .from('users')
                    .upsert({
                        id: invitedUserId,
                        email: normalizedEmail,
                        role: 'author',
                    }, { onConflict: 'id' })

                if (upsertUserError) {
                    logger.error(`[${requestId}] User upsert error`, upsertUserError)
                    return apiResponse(400, null, upsertUserError.message)
                }

                targetUserId = invitedUserId
            } else {
                if (existingUser.role === 'admin') {
                    return apiResponse(409, null, 'Cannot convert an existing admin account into an author')
                }

                const { error: roleUpdateError } = await admin
                    .from('users')
                    .update({ role: 'author' })
                    .eq('id', existingUser.id)

                if (roleUpdateError) {
                    logger.error(`[${requestId}] Role update error`, roleUpdateError)
                    return apiResponse(400, null, roleUpdateError.message)
                }

                targetUserId = existingUser.id
            }
        }

        const db = admin || supabase
        const { data: existingAuthor, error: existingAuthorError } = await db
            .from('authors')
            .select('id')
            .eq('user_id', targetUserId)
            .maybeSingle()

        if (existingAuthorError) {
            logger.error(`[${requestId}] Existing author lookup error`, existingAuthorError)
            return apiResponse(400, null, existingAuthorError.message)
        }

        if (existingAuthor) {
            return apiResponse(409, null, 'An author profile already exists for this user')
        }

        const { data: author, error } = await db
            .from('authors')
            .insert([{
                ...authorData,
                email: normalizedEmail,
                user_id: targetUserId,
            }])
            .select('id, name, slug, bio, title, email, avatar_url, social_links, user_id')
            .single()

        if (error) {
            logger.error(`[${requestId}] Database error`, error)
            return apiResponse(400, null, error.message)
        }

        logger.info(`[${requestId}] Author created`, { authorId: author.id })
        return apiResponse(201, { author })
    } catch (error) {
        if (error.name === 'ValidationError') {
            return apiResponse(422, null, error.message)
        }
        if (error.name === 'ConfigError') {
            return apiResponse(500, null, error.message)
        }
        if (error.name === 'AuthError') {
            return apiResponse(401, null, error.message)
        }

        logger.error(requestId, error)
        return apiResponse(500, null, 'Internal server error')
    }
}

export async function PATCH(request) {
    const requestId = 'PATCH-author'

    try {
        const user = await requireAuth()
        logger.info(`[${requestId}] User authenticated`, { userId: user.userId })

        const { id, ...updateData } = await request.json()
        if (!id) {
            return apiResponse(400, null, 'Author ID is required')
        }
        validateAuthor(updateData)

        const supabase = await createClient()
        const admin = user.role === 'admin' ? createAdminClient() : null
        const { data: existingAuthor, error: fetchError } = await supabase
            .from('authors')
            .select('id, user_id')
            .eq('id', id)
            .maybeSingle()

        if (fetchError || !existingAuthor) {
            return apiResponse(404, null, 'Author not found')
        }

        const isOwner = existingAuthor.user_id === user.userId
        if (user.role !== 'admin' && !isOwner) {
            return apiResponse(403, null, 'You do not have permission to update this author')
        }

        const db = admin || supabase
        const { data: author, error } = await db
            .from('authors')
            .update(updateData)
            .eq('id', id)
            .select('id, name, slug, bio, title, email, avatar_url, social_links, user_id')
            .maybeSingle()

        if (error) {
            logger.error(`[${requestId}] Database error`, error)
            return apiResponse(400, null, error.message)
        }

        logger.info(`[${requestId}] Author updated`, { authorId: id })

        const authorSlug = author?.slug || id
        revalidatePath(`/authors/${authorSlug}`)

        const { data: articleRows } = await supabase
            .from('articles')
            .select('slug, categories(slug)')
            .eq('author_id', id)
            .eq('status', 'published')
            .limit(200)

        ;(articleRows || []).forEach((row) => {
            const categorySlug = row.categories?.slug || 'news'
            revalidatePath(`/${categorySlug}/${row.slug}`)
        })

        return apiResponse(200, { author })
    } catch (error) {
        if (error.name === 'ValidationError') {
            return apiResponse(422, null, error.message)
        }
        if (error.name === 'ConfigError') {
            return apiResponse(500, null, error.message)
        }
        if (error.name === 'AuthError') {
            return apiResponse(401, null, error.message)
        }

        logger.error(requestId, error)
        return apiResponse(500, null, 'Internal server error')
    }
}

export async function DELETE(request) {
    const requestId = 'DELETE-author'

    try {
        const user = await requireAdmin()
        logger.info(`[${requestId}] Admin authenticated`, { userId: user.userId })

        const { id } = await request.json()
        if (!id) {
            return apiResponse(400, null, 'Author ID is required')
        }

        const admin = createAdminClient()
        const { error } = await admin
            .from('authors')
            .delete()
            .eq('id', id)

        if (error) {
            logger.error(`[${requestId}] Database error`, error)
            return apiResponse(400, null, error.message)
        }

        logger.info(`[${requestId}] Author deleted`, { authorId: id })
        return apiResponse(200, { success: true })
    } catch (error) {
        if (error.name === 'ConfigError') {
            return apiResponse(500, null, error.message)
        }
        if (error.name === 'AuthError') {
            const status = error.message.includes('Admin') ? 403 : 401
            return apiResponse(status, null, error.message)
        }

        logger.error(requestId, error)
        return apiResponse(500, null, 'Internal server error')
    }
}


