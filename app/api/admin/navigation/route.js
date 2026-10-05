import deploymentPolicy from '@/lib/deployment-policy.server.cjs'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-utils'
import { createAdminClient } from '@/lib/supabase/admin'
import { NAV_SELECT } from '@/lib/navigation-data'
import { navigationPayload, UUID, navigationMutationOriginAllowed } from '@/lib/navigation-model.mjs'

export const dynamic = 'force-dynamic'
function guard(request, write = false) {
  const deployment = deploymentPolicy.assertDeploymentTarget()
  if (write) {
    const origin = request.headers.get('origin')
    if (!navigationMutationOriginAllowed(origin, deployment.origin)) throw new Error('Request origin rejected')
  }
}
function failure(error) {
  const auth = error.name === 'AuthError'
  return NextResponse.json({error:auth ? error.message : 'Navigation request could not be completed'}, {status:auth ? (error.message.includes('Admin') ? 403 : 401) : 400})
}
export async function GET(request) {
  try {
    guard(request)
    await requireAdmin(request)
    const db = createAdminClient()
    const requests = [
      db.from('navigation_items').select(NAV_SELECT).order('sort_order').order('key'),
      db.from('categories').select('id,name,slug').order('name'),
      db.from('subcategories').select('id,name,slug,category_id').order('name'),
      db.from('topics').select('id,name,slug').order('name'),
      db.from('defined_landings').select('id,title,menu_key,slug,content_kind,selection_mode').order('menu_key').order('title'),
    ]
    const results = await Promise.all(requests)
    if (results.some(r => r.error)) throw new Error('Navigation lookup failed')
    return NextResponse.json({items:results[0].data, categories:results[1].data,subcategories:results[2].data,topics:results[3].data,landings:results[4].data},{headers:{'Cache-Control':'no-store'}})
  } catch (error) { return failure(error) }
}
async function save(request, editing) {
  try {
    guard(request,true)
    await requireAdmin(request)
    const input = await request.json()
    let value
    try {
      value = navigationPayload(input)
      if (editing && !UUID.test(input.id || '')) throw new Error('Select a valid menu')
      if (editing && input.id === value.parent_id) throw new Error('A menu cannot be its own parent')
    } catch (error) { return NextResponse.json({error:error.message},{status:400}) }
    const db = createAdminClient()
    const { data,error } = await (editing
      ? db.from('navigation_items').update(value).eq('id',input.id)
      : db.from('navigation_items').insert(value)).select(NAV_SELECT).single()
    if (error) {
      const message = error.code === '23505' ? 'This menu key already exists' : error.code === '23503' ? 'The selected destination no longer exists' : error.code === '23514' ? 'Menus support one submenu level; check the parent and destination' : 'Menu could not be saved'
      return NextResponse.json({error:message},{status:400})
    }
    revalidatePath('/','layout')
    return NextResponse.json({item:data},{status:editing ? 200 : 201})
  } catch (error) { return failure(error) }
}
export async function POST(request) { return save(request,false) }
export async function PATCH(request) { return save(request,true) }
