import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { desiredRoleForEmail } from '@/lib/role-utils'

export async function POST(request) {
    try {
        const { email, password, name } = await request.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
        }

        const supabase = await createClient()

        // Sign up the user
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

        const role = desiredRoleForEmail(email)

        // Ensure users table record exists (upsert) and assign role server-side only.
        const { error: upsertError } = await supabase
            .from('users')
            .upsert({ id: userId, email, role }, { onConflict: 'id' })

        if (upsertError) {
            console.error('Error upserting user record:', upsertError)
            return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
        }

        // Create author profile for non-admin roles.
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