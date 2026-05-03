import { format } from 'date-fns'

export function formatArticleCardDate(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return format(date, 'MMMM d, yyyy')
}
