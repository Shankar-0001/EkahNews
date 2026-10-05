import { revalidatePath } from 'next/cache'
import { apiResponse } from '@/lib/api-utils'
import { requireAdmin } from '@/lib/auth-utils'
import { createAdminClient } from '@/lib/supabase/admin'

const SELECT = 'id, category_id, name, slug, nav_label, page_title, page_description, seo_title, seo_description, show_in_submenu, menu_order, is_active, created_at, updated_at, categories(name, slug)'
const isMissingSchema = error => error?.code === '42P01' || error?.code === 'PGRST205'

const clean = (value) => typeof value === 'string' && value.trim() ? value.trim() : null
const payload = (input) => ({
  category_id: input.category_id || null, name: input.name?.trim(), slug: input.slug?.trim(),
  nav_label: clean(input.nav_label), page_title: clean(input.page_title), page_description: clean(input.page_description),
  seo_title: clean(input.seo_title), seo_description: clean(input.seo_description),
  show_in_submenu: Boolean(input.show_in_submenu), menu_order: Math.max(0, Number.parseInt(input.menu_order || '0', 10) || 0), is_active: input.is_active !== false,
})
function revalidate(slug) { revalidatePath('/'); revalidatePath('/sitemap.xml'); if (slug) revalidatePath(`/category/${slug}`) }

export async function GET() {
  try {
    await requireAdmin()
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('subcategories').select(SELECT).order('menu_order').order('name')
    if (error && isMissingSchema(error)) return apiResponse(200, { subcategories: [], schemaReady: false })
    if (error) return apiResponse(400, null, error.message)
    return apiResponse(200, { subcategories: data || [], schemaReady: true })
  } catch (error) {
    if (error.name === 'AuthError') return apiResponse(error.message.includes('Admin') ? 403 : 401, null, error.message)
    return apiResponse(500, null, 'An internal error occurred')
  }
}

export async function POST(request) {
  try {
    await requireAdmin()
    const input = await request.json()
    if (!input.category_id || !input.name?.trim() || !input.slug?.trim()) return apiResponse(400, null, 'Parent category, name, and slug are required')
    const admin = createAdminClient()
    const { data, error } = await admin.from('subcategories').insert(payload(input)).select(SELECT).single()
    if (error) return apiResponse(isMissingSchema(error) ? 409 : 400, null, isMissingSchema(error) ? 'Apply the taxonomy migration in an isolated development database before creating subcategories.' : error.message)
    revalidate(data.categories?.slug)
    return apiResponse(201, { subcategory: data })
  } catch (error) {
    if (error.name === 'AuthError') return apiResponse(error.message.includes('Admin') ? 403 : 401, null, error.message)
    return apiResponse(500, null, 'An internal error occurred')
  }
}

export async function PATCH(request) {
  try {
    await requireAdmin()
    const input = await request.json()
    if (!input.id || !input.category_id || !input.name?.trim() || !input.slug?.trim()) return apiResponse(400, null, 'ID, parent category, name, and slug are required')
    const admin = createAdminClient()
    const { data, error } = await admin.from('subcategories').update({ ...payload(input), updated_at: new Date().toISOString() }).eq('id', input.id).select(SELECT).single()
    if (error) return apiResponse(isMissingSchema(error) ? 409 : 400, null, isMissingSchema(error) ? 'Apply the taxonomy migration in an isolated development database before editing subcategories.' : error.message)
    revalidate(data.categories?.slug)
    return apiResponse(200, { subcategory: data })
  } catch (error) {
    if (error.name === 'AuthError') return apiResponse(error.message.includes('Admin') ? 403 : 401, null, error.message)
    return apiResponse(500, null, 'An internal error occurred')
  }
}

export async function DELETE(request) {
  try {
    await requireAdmin()
    const { id } = await request.json()
    if (!id) return apiResponse(400, null, 'Subcategory ID is required')
    const admin = createAdminClient()
    const { error } = await admin.from('subcategories').delete().eq('id', id)
    if (error) return apiResponse(400, null, error.message)
    revalidate()
    return apiResponse(200, { deleted: true })
  } catch (error) {
    if (error.name === 'AuthError') return apiResponse(error.message.includes('Admin') ? 403 : 401, null, error.message)
    return apiResponse(500, null, 'An internal error occurred')
  }
}
