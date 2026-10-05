import { revalidatePath } from 'next/cache'
import { apiResponse } from '@/lib/api-utils'
import { requireAdmin } from '@/lib/auth-utils'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SELECT = 'id, name, slug, nav_label, page_title, page_description, seo_title, seo_description, menu_order, is_active, created_at, updated_at'
const missing = (error) => /web_story_sections|relation.*does not exist/i.test(error?.message || '')
const clean = (value) => typeof value === 'string' && value.trim() ? value.trim() : null
const payload = (input) => ({ name: input.name?.trim(), slug: input.slug?.trim(), nav_label: clean(input.nav_label), page_title: clean(input.page_title), page_description: clean(input.page_description), seo_title: clean(input.seo_title), seo_description: clean(input.seo_description), menu_order: Math.max(0, Number.parseInt(input.menu_order || '0', 10) || 0), is_active: input.is_active !== false })
function revalidate() { revalidatePath('/web-stories'); revalidatePath('/web-stories-sitemap.xml'); revalidatePath('/sitemap.xml') }

export async function GET() {
  try {
    await requireAdmin()
    const { data, error } = await (await createClient()).from('web_story_sections').select(SELECT).order('menu_order').order('name')
    if (error && missing(error)) return apiResponse(200, { sections: [], schemaReady: false })
    if (error) return apiResponse(400, null, error.message)
    return apiResponse(200, { sections: data || [], schemaReady: true })
  } catch (error) {
    if (error.name === 'AuthError') return apiResponse(error.message.includes('Admin') ? 403 : 401, null, error.message)
    return apiResponse(500, null, 'An internal error occurred')
  }
}
export async function POST(request) {
  try {
    await requireAdmin(); const input = await request.json()
    if (!input.name?.trim() || !input.slug?.trim()) return apiResponse(400, null, 'Name and slug are required')
    const { data, error } = await createAdminClient().from('web_story_sections').insert(payload(input)).select(SELECT).single()
    if (error) return apiResponse(missing(error) ? 409 : 400, null, missing(error) ? 'Apply the Web Story sections migration in an isolated development database before saving sections.' : error.message)
    revalidate(); return apiResponse(201, { section: data })
  } catch (error) { if (error.name === 'AuthError') return apiResponse(error.message.includes('Admin') ? 403 : 401, null, error.message); return apiResponse(500, null, 'An internal error occurred') }
}
export async function PATCH(request) {
  try {
    await requireAdmin(); const input = await request.json()
    if (!input.id || !input.name?.trim() || !input.slug?.trim()) return apiResponse(400, null, 'ID, name, and slug are required')
    const { data, error } = await createAdminClient().from('web_story_sections').update({ ...payload(input), updated_at: new Date().toISOString() }).eq('id', input.id).select(SELECT).single()
    if (error) return apiResponse(missing(error) ? 409 : 400, null, missing(error) ? 'Apply the Web Story sections migration in an isolated development database before editing sections.' : error.message)
    revalidate(); return apiResponse(200, { section: data })
  } catch (error) { if (error.name === 'AuthError') return apiResponse(error.message.includes('Admin') ? 403 : 401, null, error.message); return apiResponse(500, null, 'An internal error occurred') }
}
export async function DELETE(request) {
  try {
    await requireAdmin(); const { id } = await request.json()
    if (!id) return apiResponse(400, null, 'Section ID is required')
    const { error } = await createAdminClient().from('web_story_sections').delete().eq('id', id)
    if (error) return apiResponse(400, null, error.message)
    revalidate(); return apiResponse(200, { deleted: true })
  } catch (error) { if (error.name === 'AuthError') return apiResponse(error.message.includes('Admin') ? 403 : 401, null, error.message); return apiResponse(500, null, 'An internal error occurred') }
}
