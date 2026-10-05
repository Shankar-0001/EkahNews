export function getCategoryHref(category) {
  return `/category/${category.slug}`
}

export function getSubcategoryHref(category, subcategory) {
  // Keep the established section URL; article URLs never include this segment.
  return `/section/${category.slug}/${subcategory.slug}`
}

export function normalizeNavigation(categories = []) {
  return categories
    .filter((category) => category?.show_in_main_menu && category?.is_active !== false)
    .sort((a, b) => (a.menu_order - b.menu_order) || (a.name || '').localeCompare(b.name || ''))
    .map((category) => ({
      ...category,
      label: category.nav_label || category.name,
      href: getCategoryHref(category),
      subcategories: (category.subcategories || [])
        .filter((item) => item?.show_in_submenu && item?.is_active !== false)
        .sort((a, b) => (a.menu_order - b.menu_order) || (a.name || '').localeCompare(b.name || ''))
        .map((item) => ({ ...item, label: item.nav_label || item.name, href: getSubcategoryHref(category, item) })),
    }))
}
