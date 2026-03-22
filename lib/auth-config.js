export function isPublicSignupEnabled() {
  return process.env.ALLOW_PUBLIC_SIGNUP === 'true' || process.env.NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP === 'true'
}
