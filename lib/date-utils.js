import { format } from 'date-fns'

export function formatArticleCardDate(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const isSameYear = now.getFullYear() === date.getFullYear()

  return format(date, isSameYear ? 'MMMM d' : 'MMMM d, yyyy')
}
