import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { desiredRoleForEmail } from '@/lib/role-utils'
import { isPublicSignupEnabled } from '@/lib/auth-config'
import { checkRateLimit, getClientIp } from '@/lib/request-guards'

export async function POST(request) {
    try {
        const rateResult = checkRateLimit({
            key: `${getClientIp(request)}:auth:signup`,
            limit: 5,
            windowMs: 60 * 60 * 1000,
        })

        if (!rateResult.allowed) {
            return new Response(
                JSON.stringify({
                    success: false,
                    status: 429,
                    error: 'Too many signup attempts. Please try again later.',
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

        if (!isPublicSignupEnabled()) {
            return NextResponse.json({ error: 'Public signup is disabled' }, { status: 403 })
        }

        const { email, password, name } = await request.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
        }

        const supabase = await createClient()

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        })

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        const userId = authData.user?.id
        if (!userId) {
            return NextResponse.json({ error: 'User creation failed' }, { status: 400 })
        }

        const role = desiredRoleForEmail(email) || 'author'

        const { error: upsertError } = await supabase
            .from('users')
            .upsert({ id: userId, email, role }, { onConflict: 'id' })

        if (upsertError) {
            console.error('Error upserting user record:', upsertError)
            return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
        }

        if (role !== 'admin') {
            const { error: authorError } = await supabase
                .from('authors')
                .insert({
                    user_id: userId,
                    name: name || email.split('@')[0],
                    email,
                })

            if (authorError) {
                console.error('Error creating author profile:', authorError)
                return NextResponse.json({ error: 'Failed to create author profile' }, { status: 500 })
            }
        }

        return NextResponse.json({
            user: authData.user,
            message: 'Signup successful'
        })
    } catch (error) {
        console.error('Signup API error:', error)
        return NextResponse.json(
            { error: 'Registration failed' },
            { status: 500 }
        )
    }
}
