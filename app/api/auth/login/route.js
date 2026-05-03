import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { desiredRoleForEmail } from '@/lib/role-utils'
import { checkRateLimit, getClientIp } from '@/lib/request-guards'

export async function POST(request) {
    try {
        const rateResult = checkRateLimit({
            key: `${getClientIp(request)}:auth:login`,
            limit: 10,
            windowMs: 15 * 60 * 1000,
        })

        if (!rateResult.allowed) {
            return new Response(
                JSON.stringify({
                    success: false,
                    status: 429,
                    error: 'Too many login attempts. Please try again later.',
                    timestamp: new Date().toISOString(),
                }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'Retry-After': String(Math.max(1, Math.ceil((rateResult.resetAt - Date.now()) / 1000))),
                    },
                }
            )
        }

        const { email, password } = await request.json()

        const supabase = await createClient()
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 401 })
        }

        const user = data?.user
        if (user?.id && user?.email) {
            const { data: userRow, error: userRowError } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .maybeSingle()

            if (userRowError) {
                console.error('Error loading user record during login:', userRowError)
                return NextResponse.json({ error: 'Failed to load user profile' }, { status: 500 })
            }

            const nextRole = desiredRoleForEmail(user.email, userRow?.role) || 'author'

            if (nextRole !== userRow?.role) {
                const { error: updateRoleError } = await supabase
                    .from('users')
                    .update({ role: nextRole })
                    .eq('id', user.id)

                if (updateRoleError) {
                    console.error('Error updating user role during login:', updateRoleError)
                    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 })
                }
            }

            // Ensure invited/legacy author accounts have an author profile.
            if (nextRole === 'author') {
                const { data: author, error: authorLookupError } = await supabase
                    .from('authors')
                    .select('id')
                    .eq('user_id', user.id)
                    .maybeSingle()

                if (authorLookupError) {
                    console.error('Error loading author profile during login:', authorLookupError)
                    return NextResponse.json({ error: 'Failed to load author profile' }, { status: 500 })
                }

                if (!author) {
                    const { error: authorInsertError } = await supabase
                        .from('authors')
                        .insert({
                            user_id: user.id,
                            name: user.email.split('@')[0],
                            email: user.email,
                        })

                    if (authorInsertError) {
                        console.error('Error creating author profile during login:', authorInsertError)
                        return NextResponse.json({ error: 'Failed to create author profile' }, { status: 500 })
                    }
                }
            }
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error('Auth API error:', error)
        return NextResponse.json(
            { error: 'Authentication failed' },
            { status: 500 }
        )
    }
}
