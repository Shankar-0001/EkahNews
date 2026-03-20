import { createClient } from '@supabase/supabase-js'

export class ConfigError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ConfigError'
  }
}

// Admin client with service role key for server-side operations
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new ConfigError('Missing NEXT_PUBLIC_SUPABASE_URL in server environment')
  }

  if (!serviceRoleKey) {
    throw new ConfigError('Missing SUPABASE_SERVICE_ROLE_KEY in server environment')
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
