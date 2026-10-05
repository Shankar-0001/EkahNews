import deploymentPolicy from '../deployment-policy.server.cjs'
import { createClient } from '@supabase/supabase-js'

export class ConfigError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ConfigError'
  }
}

// Admin client with service role key for server-side operations
export function createAdminClient() {
  const { url: supabaseUrl } = deploymentPolicy.assertDeploymentTarget()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

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
