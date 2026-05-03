export const BLOCKED_CATEGORY_SLUGS = ['eijfjka', 'kdfjskfj', 'skdfjoisk']
export const FEED_ONLY_CATEGORY_SLUGS = ['latest-news']

export function isBlockedCategorySlug(slug) {
  return BLOCKED_CATEGORY_SLUGS.includes(slug)
}

export function isFeedOnlyCategorySlug(slug) {
  return FEED_ONLY_CATEGORY_SLUGS.includes(slug)
}

export function filterBlockedCategories(categories = []) {
  return categories.filter((category) => !isBlockedCategorySlug(category?.slug))
}

export function filterEditorialCategories(categories = []) {
  return filterBlockedCategories(categories).filter((category) => !isFeedOnlyCategorySlug(category?.slug))
}
