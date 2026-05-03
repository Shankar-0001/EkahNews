export function parseAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || ''
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email = '') {
  if (!email) return false
  const adminEmails = parseAdminEmails()
  return adminEmails.includes(email.toLowerCase())
}

export function desiredRoleForEmail(email = '', currentRole = null) {
  if (isAdminEmail(email)) return 'admin'
  return currentRole || null
}
