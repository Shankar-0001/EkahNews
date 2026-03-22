import { revalidatePath } from 'next/cache'
import { apiResponse } from '@/lib/api-utils'
import { requireAdmin } from '@/lib/auth-utils'
import { createAdminClient } from '@/lib/supabase/admin'

function getPaging(url) {
  const search = new URL(url).searchParams
  const page = Math.max(1, Number.parseInt(search.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, Number.parseInt(search.get('limit') || '30', 10)))
  const from = (page - 1) * limit
  const to = from + limit - 1
  return { page, limit, from, to }
}

function revalidateTagSurface(slug) {
  revalidatePath('/sitemap.xml')
  if (slug) {
    revalidatePath(`/tags/${slug}`)
  }
}

export async function GET(request) {
  try {
    await requireAdmin()
    const admin = createAdminClient()
    const { page, limit, from, to } = getPaging(request.url)

    const { data, count, error } = await admin
      .from('tags')
      .select('id, name, slug, created_at, updated_at', { count: 'exact' })
      .order('name')
      .range(from, to)

    if (error) return apiResponse(400, null, error.message)

    return apiResponse(200, {
      tags: data || [],
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
    return apiResponse(500, null, error.message || 'Failed to load tags')
  }
}

export async function POST(request) {
  try {
    await requireAdmin()
    const admin = createAdminClient()
    const { name, slug } = await request.json()

    if (!name || !slug) {
      return apiResponse(400, null, 'Name and slug are required')
    }

    const { data, error } = await admin
      .from('tags')
      .insert({ name, slug })
      .select('id, name, slug, created_at, updated_at')
      .single()

    if (error) return apiResponse(400, null, error.message)
    revalidateTagSurface(data.slug)
    return apiResponse(201, { tag: data })
  } catch (error) {
    if (error.name === 'AuthError') {
      const status = error.message.includes('Admin') ? 403 : 401
      return apiResponse(status, null, error.message)
    }
    return apiResponse(500, null, error.message || 'Failed to create tag')
  }
}

export async function DELETE(request) {
  try {
    await requireAdmin()
    const admin = createAdminClient()
    const { id } = await request.json()
    if (!id) return apiResponse(400, null, 'Tag ID is required')

    const { data: existingTag } = await admin
      .from('tags')
      .select('slug')
      .eq('id', id)
      .maybeSingle()

    const { error } = await admin
      .from('tags')
      .delete()
      .eq('id', id)

    if (error) return apiResponse(400, null, error.message)
    revalidateTagSurface(existingTag?.slug)
    return apiResponse(200, { deleted: true })
  } catch (error) {
    if (error.name === 'AuthError') {
      const status = error.message.includes('Admin') ? 403 : 401
      return apiResponse(status, null, error.message)
    }
    return apiResponse(500, null, error.message || 'Failed to delete tag')
  }
}
