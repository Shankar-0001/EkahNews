export const BLOCKED_CATEGORY_SLUGS = ['eijfjka', 'kdfjskfj', 'skdfjoisk']
export const FEED_ONLY_CATEGORY_SLUGS = ['latest-news']
export const HIDDEN_DASHBOARD_CATEGORY_SLUGS = ['entertainment', 'gaming', 'guides']

export function isBlockedCategorySlug(slug) {
  return BLOCKED_CATEGORY_SLUGS.includes(slug)
}

export function isFeedOnlyCategorySlug(slug) {
  return FEED_ONLY_CATEGORY_SLUGS.includes(slug)
}

export function isHiddenDashboardCategorySlug(slug) {
  return HIDDEN_DASHBOARD_CATEGORY_SLUGS.includes(slug)
}

export function filterHiddenDashboardCategories(categories = []) {
  return categories.filter((category) => !isHiddenDashboardCategorySlug(category?.slug))
}

export function filterBlockedCategories(categories = []) {
  return categories.filter((category) => !isBlockedCategorySlug(category?.slug))
}

export function filterEditorialCategories(categories = []) {
  return filterHiddenDashboardCategories(filterBlockedCategories(categories)).filter((category) => !isFeedOnlyCategorySlug(category?.slug))
}
