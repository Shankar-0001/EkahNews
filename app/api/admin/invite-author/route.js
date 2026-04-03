import { apiResponse } from '@/lib/api-utils'
import { requireAdmin } from '@/lib/auth-utils'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request) {
  try {
    await requireAdmin()
    const { email, name } = await request.json()

    if (!email) return apiResponse(400, null, 'Email is required')

    const normalizedEmail = email.trim().toLowerCase()
    const displayName = (name || normalizedEmail.split('@')[0]).trim()
    const admin = createAdminClient()

    // Always enforce author role for invited users.
    const { data: existingUser } = await admin
      .from('users')
      .select('id, role')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingUser?.id) {
      if (existingUser.role === 'admin') {
        return apiResponse(409, null, 'Cannot convert an existing admin account into an author')
      }

      await admin
        .from('users')
        .update({ role: 'author' })
        .eq('id', existingUser.id)

      const { data: existingAuthor } = await admin
        .from('authors')
        .select('id')
        .eq('user_id', existingUser.id)
        .maybeSingle()

      if (!existingAuthor) {
        await admin
          .from('authors')
          .insert({
            user_id: existingUser.id,
            name: displayName,
            email: normalizedEmail,
          })
      }

      return apiResponse(200, { invited: false, existing: true }, null)
    }

    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, {
      data: { name: displayName },
    })

    if (inviteError) return apiResponse(400, null, inviteError.message)

    return apiResponse(200, { invited: true, existing: false }, null)
  } catch (error) {
    if (error.name === 'AuthError') {
      const status = error.message.includes('Admin') ? 403 : 401
      return apiResponse(status, null, error.message)
    }
    return apiResponse(500, null, error.message || 'Failed to invite author')
  }
}
