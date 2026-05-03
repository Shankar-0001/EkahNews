export const BLOCKED_CATEGORY_SLUGS = ['eijfjka', 'kdfjskfj', 'skdfjoisk']

export function isBlockedCategorySlug(slug) {
  return BLOCKED_CATEGORY_SLUGS.includes(slug)
}

export function filterBlockedCategories(categories = []) {
  return categories.filter((category) => !isBlockedCategorySlug(category?.slug))
}
