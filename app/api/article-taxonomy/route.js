import { NextResponse } from 'next/server'
import { requireRequestAuth } from '@/lib/auth-utils'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertDeploymentTarget } from '@/lib/atomic-article.mjs'
export const dynamic='force-dynamic'
export async function GET(request) {
  try {
    assertDeploymentTarget()
    await requireRequestAuth(request)
    const db=createAdminClient()
    const results=await Promise.all([
      db.from('subcategories').select('id,name,category_id,is_active').order('name'),
      db.from('topics').select('id,name,is_active').order('name'),
    ])
    if(results.some(r=>r.error)) throw new Error('Taxonomy unavailable')
    return NextResponse.json({subcategories:results[0].data,topics:results[1].data},{headers:{'Cache-Control':'no-store'}})
  } catch(error) {return NextResponse.json({error:error.name==='AuthError'?error.message:'Taxonomy could not be loaded'},{status:error.name==='AuthError'?401:503})}
}
