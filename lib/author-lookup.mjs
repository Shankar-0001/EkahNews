export function authorLookupFilter(slug) {
  if (typeof slug !== 'string' || !/^@?[a-zA-Z0-9_-]+$/.test(slug)) return null
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)) return 'id.eq.' + slug
  const alternate = slug.startsWith('@') ? slug.slice(1) : '@' + slug
  return 'slug.eq.' + slug + ',slug.eq.' + alternate
}
