import deploymentPolicy from '../deployment-policy.cjs'
import { createClient } from '@supabase/supabase-js'

export function hasPublicSupabaseConfig() {
  deploymentPolicy.getPublicDeployment()
  return true
}

export function createPublicClient() {
  deploymentPolicy.getPublicDeployment()
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  )
}

export function createOptionalPublicClient() {
  if (!hasPublicSupabaseConfig()) {
    return null
  }

  return createPublicClient()
}
