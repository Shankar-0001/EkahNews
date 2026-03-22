import { revalidatePath } from 'next/cache'
import { apiResponse } from '@/lib/api-utils'
import { requireAdmin } from '@/lib/auth-utils'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function getPaging(url) {
  const search = new URL(url).searchParams
  const page = Math.max(1, Number.parseInt(search.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, Number.parseInt(search.get('limit') || '20', 10)))
  const from = (page - 1) * limit
  const to = from + limit - 1
  return { page, limit, from, to }
}

function revalidateCategorySurface(slug) {
  revalidatePath('/')
  revalidatePath('/sitemap.xml')
  revalidatePath('/category-sitemap.xml')
  if (slug) {
    revalidatePath(`/category/${slug}`)
  }
}

export async function GET(request) {
  try {
    await requireAdmin()
    const supabase = await createClient()
    const { page, limit, from, to } = getPaging(request.url)

    const { data, count, error } = await supabase
      .from('categories')
      .select('id, name, slug, description, created_at, updated_at', { count: 'exact' })
      .order('name')
      .range(from, to)

    if (error) return apiResponse(400, null, error.message)

    return apiResponse(200, {
      categories: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    if (error.name === 'AuthError') {
      const status = error.message.includes('Admin') ? 403 : 401
      return apiResponse(status, null, error.message)
    }
    return apiResponse(500, null, error.message || 'Failed to load categories')
  }
}

export async function POST(request) {
  try {
    await requireAdmin()
    const admin = createAdminClient()
    const { name, slug, description } = await request.json()

    if (!name || !slug) {
      return apiResponse(400, null, 'Name and slug are required')
    }

    const { data, error } = await admin
      .from('categories')
      .insert({ name, slug, description: description || null })
      .select('id, name, slug, description, created_at, updated_at')
      .single()

    if (error) return apiResponse(400, null, error.message)
    revalidateCategorySurface(data.slug)
    return apiResponse(201, { category: data })
  } catch (error) {
    if (error.name === 'AuthError') {
      const status = error.message.includes('Admin') ? 403 : 401
      return apiResponse(status, null, error.message)
    }
    return apiResponse(500, null, error.message || 'Failed to create category')
  }
}

export async function PATCH(request) {
  try {
    await requireAdmin()
    const admin = createAdminClient()
    const { id, name, slug, description } = await request.json()

    if (!id) return apiResponse(400, null, 'Category ID is required')
    if (!name || !slug) return apiResponse(400, null, 'Name and slug are required')

    const { data: existingCategory } = await admin
      .from('categories')
      .select('slug')
      .eq('id', id)
      .maybeSingle()

    const { data, error } = await admin
      .from('categories')
      .update({
        name,
        slug,
        description: description || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, name, slug, description, created_at, updated_at')
      .single()

    if (error) return apiResponse(400, null, error.message)
    revalidateCategorySurface(existingCategory?.slug)
    revalidateCategorySurface(data.slug)
    return apiResponse(200, { category: data })
  } catch (error) {
    if (error.name === 'AuthError') {
      const status = error.message.includes('Admin') ? 403 : 401
      return apiResponse(status, null, error.message)
    }
    return apiResponse(500, null, error.message || 'Failed to update category')
  }
}

export async function DELETE(request) {
  try {
    await requireAdmin()
    const admin = createAdminClient()
    const { id } = await request.json()
    if (!id) return apiResponse(400, null, 'Category ID is required')

    const { data: existingCategory } = await admin
      .from('categories')
      .select('slug')
      .eq('id', id)
      .maybeSingle()

    const { error } = await admin
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) return apiResponse(400, null, error.message)
    revalidateCategorySurface(existingCategory?.slug)
    return apiResponse(200, { deleted: true })
  } catch (error) {
    if (error.name === 'AuthError') {
      const status = error.message.includes('Admin') ? 403 : 401
      return apiResponse(status, null, error.message)
    }
    return apiResponse(500, null, error.message || 'Failed to delete category')
  }
}
