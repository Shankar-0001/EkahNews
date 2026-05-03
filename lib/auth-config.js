export function isPublicSignupEnabled() {
  const rawValue = process.env.ALLOW_PUBLIC_SIGNUP ?? process.env.NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP ?? 'false'
  return rawValue === 'true'
}
