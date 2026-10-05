const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const DESTINATION_FIELDS = { category: 'category_id', subcategory: 'subcategory_id', topic: 'topic_id', landing: 'landing_id' }
export function isInternalPath(value) {
  if (typeof value !== 'string' || value.length > 2048) return false
  let path = value
  for (let i = 0; i < 4; i++) {
    if (!path.startsWith('/') || path.startsWith('//') || /[\\\s\x00-\x1f\x7f]/.test(path)) return false
    try { const decoded = decodeURIComponent(path); if (decoded === path) return true; path = decoded } catch { return false }
  }
  return false
}
export function destinationHref(row) {
  switch (row.destination_type) {
    case 'internal': return isInternalPath(row.custom_path) ? row.custom_path : null
    case 'category': return row.category && slug.test(row.category.slug) ? '/category/' + row.category.slug : null
    case 'subcategory': return row.subcategory?.is_active && slug.test(row.subcategory.slug) && slug.test(row.subcategory.categories?.slug) ? '/subcategory/' + row.subcategory.categories.slug + '/' + row.subcategory.slug : null
    case 'topic': return row.topic?.is_active && slug.test(row.topic.slug) ? '/topics/' + row.topic.slug : null
    case 'landing': return row.landing?.is_active && slug.test(row.landing.menu_key) && slug.test(row.landing.slug) ? '/section/' + row.landing.menu_key + '/' + row.landing.slug : null
    case 'web_stories': return '/web-stories'
    case 'sponsored': return '/sponsored'
    default: return null
  }
}
export function buildNavigation(rows = []) {
  const order = (a,b) => a.sort_order - b.sort_order || a.key.localeCompare(b.key)
  const items = rows.filter(r => r.is_enabled && destinationHref(r)).sort(order).map(r => ({
    id:r.id, parent_id:r.parent_id, key:r.key, label:r.title, href:destinationHref(r),
    slug:r.landing?.slug || r.key, page_title:r.page_title, description:r.description,
  }))
  return items.filter(r => !r.parent_id).map(root => ({ ...root, children:items.filter(r => r.parent_id === root.id) }))
}
export function activeMenu(pathname, menus) {
  return menus.find(m => m.children.some(c => pathname === c.href))?.key
    || menus.find(m => m.href === pathname)?.key
    || menus.filter(m => m.href !== '/' && pathname.startsWith(m.href + '/')).sort((a,b) => b.href.length-a.href.length)[0]?.key || null
}
export function navigationPayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Menu details are required')
  if (typeof input.key !== 'string' || input.key.length > 100 || !slug.test(input.key)) throw new Error('Use a lowercase menu key with hyphens')
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 160) throw new Error('Enter a menu title up to 160 characters')
  if (!Number.isInteger(input.sort_order) || input.sort_order < 0 || input.sort_order > 1000000) throw new Error('Enter a whole-number display order')
  if (typeof input.is_enabled !== 'boolean') throw new Error('Menu visibility is required')
  if (input.parent_id && !UUID.test(input.parent_id)) throw new Error('Select a valid parent menu')
  const fields = Object.values(DESTINATION_FIELDS)
  const payload = {key:input.key,title:input.title.trim(),parent_id:input.parent_id || null,sort_order:input.sort_order,is_enabled:input.is_enabled,destination_type:input.destination_type,custom_path:null,...Object.fromEntries(fields.map(f => [f,null]))}
  const field = DESTINATION_FIELDS[input.destination_type]
  if (field) {
    if (!UUID.test(input[field] || '')) throw new Error('Select a destination')
    payload[field] = input[field]
  } else if (input.destination_type === 'internal') {
    if (!isInternalPath(input.custom_path)) throw new Error('Use a safe internal path beginning with /')
    payload.custom_path = input.custom_path
  } else if (!['web_stories','sponsored'].includes(input.destination_type)) throw new Error('Select a supported destination type')
  for (const key of ['page_title','description']) {
    if (input[key] != null && (typeof input[key] !== 'string' || input[key].length > 2000)) throw new Error('Page text is too long')
    payload[key] = input[key]?.trim() || null
  }
  return payload
}

// Local aliases refer to the same rehearsal origin only at the same scheme/port.
export function navigationMutationOriginAllowed(origin, requestUrl) {
  if (!origin) return true
  try {
    const source = new URL(origin)
    const target = new URL(requestUrl)
    if (source.origin !== origin || !['http:', 'https:'].includes(source.protocol)) return false
    if (source.origin === target.origin) return true
    const loopback = new Set(['localhost', '127.0.0.1', '[::1]'])
    return loopback.has(source.hostname) && loopback.has(target.hostname)
      && source.protocol === target.protocol && source.port === target.port
  } catch { return false }
}
