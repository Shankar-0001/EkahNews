import deploymentPolicy from '../deployment-policy.cjs'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  deploymentPolicy.getPublicDeployment()
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}