import { revalidatePath } from 'next/cache'
import { apiResponse } from '@/lib/api-utils'
import { requireAdmin } from '@/lib/auth-utils'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const TAXONOMY_SELECT = 'id, name, slug, description, nav_label, page_title, page_description, seo_title, seo_description, show_in_main_menu, menu_order, is_active, created_at, updated_at'
const LEGACY_SELECT = 'id, name, slug, description, created_at, updated_at'

function isMissingTaxonomySchema(error) {
  return /nav_label|page_title|page_description|show_in_main_menu|menu_order|is_active/i.test(error?.message || '')
}

function normalizeLegacyCategory(category) {
  return { ...category, nav_label: null, page_title: null, page_description: null, seo_title: null, seo_description: null, show_in_main_menu: false, menu_order: 0, is_active: true }
}

function getPaging(url) {
  const search = new URL(url).searchParams
  const page = Math.max(1, Number.parseInt(search.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, Number.parseInt(search.get('limit') || '20', 10)))
  const from = (page - 1) * limit
  return { page, limit, from, to: from + limit - 1 }
}

function clean(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function revalidateCategorySurface(slug) {
  revalidatePath('/')
  revalidatePath('/sitemap.xml')
  revalidatePath('/category-sitemap.xml')
  if (slug) revalidatePath(`/category/${slug}`)
}

function taxonomyPayload(input) {
  return {
    name: input.name?.trim(),
    slug: input.slug?.trim(),
    description: clean(input.description),
    nav_label: clean(input.nav_label),
    page_title: clean(input.page_title),
    page_description: clean(input.page_description),
    seo_title: clean(input.seo_title),
    seo_description: clean(input.seo_description),
    show_in_main_menu: Boolean(input.show_in_main_menu),
    menu_order: Math.max(0, Number.parseInt(input.menu_order || '0', 10) || 0),
    is_active: input.is_active !== false,
  }
}

export async function GET(request) {
  try {
    await requireAdmin()
    const supabase = await createClient()
    const { page, limit, from, to } = getPaging(request.url)
    let result = await supabase.from('categories').select(TAXONOMY_SELECT, { count: 'exact' }).order('menu_order').order('name').range(from, to)
    const legacy = result.error && isMissingTaxonomySchema(result.error)
    if (legacy) result = await supabase.from('categories').select(LEGACY_SELECT, { count: 'exact' }).order('name').range(from, to)
    if (result.error) return apiResponse(400, null, result.error.message)

    return apiResponse(200, {
      categories: legacy ? (result.data || []).map(normalizeLegacyCategory) : (result.data || []),
      schemaReady: !legacy,
      pagination: { page, limit, total: result.count || 0, pages: Math.ceil((result.count || 0) / limit) },
    })
  } catch (error) {
    if (error.name === 'AuthError') return apiResponse(error.message.includes('Admin') ? 403 : 401, null, error.message)
    console.error('Categories GET error:', error)
    return apiResponse(500, null, 'An internal error occurred')
  }
}

export async function POST(request) {
  try {
    await requireAdmin()
    const input = await request.json()
    if (!input.name?.trim() || !input.slug?.trim()) return apiResponse(400, null, 'Name and slug are required')
    const admin = createAdminClient()
    const { data, error } = await admin.from('categories').insert(taxonomyPayload(input)).select(TAXONOMY_SELECT).single()
    if (error) return apiResponse(isMissingTaxonomySchema(error) ? 409 : 400, null, isMissingTaxonomySchema(error) ? 'Apply the taxonomy migration in an isolated development database before saving taxonomy settings.' : error.message)
    revalidateCategorySurface(data.slug)
    return apiResponse(201, { category: data })
  } catch (error) {
    if (error.name === 'AuthError') return apiResponse(error.message.includes('Admin') ? 403 : 401, null, error.message)
    return apiResponse(500, null, 'An internal error occurred')
  }
}

export async function PATCH(request) {
  try {
    await requireAdmin()
    const input = await request.json()
    if (!input.id || !input.name?.trim() || !input.slug?.trim()) return apiResponse(400, null, 'ID, name, and slug are required')
    const admin = createAdminClient()
    const { data: current } = await admin.from('categories').select('slug').eq('id', input.id).maybeSingle()
    const { data, error } = await admin.from('categories').update({ ...taxonomyPayload(input), updated_at: new Date().toISOString() }).eq('id', input.id).select(TAXONOMY_SELECT).single()
    if (error) return apiResponse(isMissingTaxonomySchema(error) ? 409 : 400, null, isMissingTaxonomySchema(error) ? 'Apply the taxonomy migration in an isolated development database before saving taxonomy settings.' : error.message)
    revalidateCategorySurface(current?.slug)
    revalidateCategorySurface(data.slug)
    return apiResponse(200, { category: data })
  } catch (error) {
    if (error.name === 'AuthError') return apiResponse(error.message.includes('Admin') ? 403 : 401, null, error.message)
    return apiResponse(500, null, 'An internal error occurred')
  }
}

export async function DELETE(request) {
  try {
    await requireAdmin()
    const { id } = await request.json()
    if (!id) return apiResponse(400, null, 'Category ID is required')
    const admin = createAdminClient()
    const { data: current } = await admin.from('categories').select('slug').eq('id', id).maybeSingle()
    const { error } = await admin.from('categories').delete().eq('id', id)
    if (error?.code === '23503') {
      const hasSubcategories = error.message?.includes('subcategories_category_id_fkey')
      return apiResponse(409, null, hasSubcategories
        ? 'This category has linked subcategories and cannot be deleted. Review them in Dashboard > Subcategories. To hide the menu without deleting content, disable its entry in Dashboard > Navigation.'
        : 'This category is still used by other records and cannot be deleted. Review its content and navigation links first. No records were deleted.')
    }
    if (error) return apiResponse(400, null, 'Unable to delete this category. Please try again or review its dependencies.')
    revalidateCategorySurface(current?.slug)
    return apiResponse(200, { deleted: true })
  } catch (error) {
    if (error.name === 'AuthError') return apiResponse(error.message.includes('Admin') ? 403 : 401, null, error.message)
    return apiResponse(500, null, 'An internal error occurred')
  }
}
