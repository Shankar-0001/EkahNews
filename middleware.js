import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { desiredRoleForEmail } from './lib/role-utils'

function getPreferredOrigin() {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.ekahnews.com'

  try {
    const url = new URL(configuredBaseUrl)

    if (url.hostname === 'ekahnews.com') {
      url.hostname = 'www.ekahnews.com'
    }

    url.protocol = 'https:'
    return url.origin
  } catch {
    return 'https://www.ekahnews.com'
  }
}

function shouldRedirectToPreferredOrigin(currentUrl, preferredOrigin) {
  try {
    const preferredUrl = new URL(preferredOrigin)
    const currentHostname = currentUrl.hostname
    const preferredHostname = preferredUrl.hostname

    const shouldUpgradeProtocol =
      currentHostname === preferredHostname
      && currentUrl.protocol !== preferredUrl.protocol

    const shouldUpgradeHostname =
      currentHostname === 'ekahnews.com'
      && preferredHostname === 'www.ekahnews.com'
      && currentUrl.protocol === preferredUrl.protocol

    return shouldUpgradeProtocol || shouldUpgradeHostname
  } catch {
    return false
  }
}

function getDashboardRoutePolicy(pathname) {
  const routePolicies = [
    { prefix: '/dashboard/categories', roles: ['admin'] },
    { prefix: '/dashboard/authors', roles: ['admin'] },
    { prefix: '/dashboard/settings', roles: ['admin'] },
    { prefix: '/dashboard/media', roles: ['admin'] },
    { prefix: '/dashboard/footer', roles: ['admin'] },
    { prefix: '/dashboard/tags', roles: ['admin'] },
    { prefix: '/dashboard/articles', roles: ['admin', 'author'] },
    { prefix: '/dashboard/web-stories', roles: ['admin', 'author'] },
  ]

  return routePolicies.find((policy) => pathname === policy.prefix || pathname.startsWith(`${policy.prefix}/`)) || null
}

export async function middleware(request) {
  const pathname = request.nextUrl.pathname
  const preferredOrigin = getPreferredOrigin()
  const currentUrl = request.nextUrl.clone()
  const VALID_ROLES = ['admin', 'author']

  if (shouldRedirectToPreferredOrigin(currentUrl, preferredOrigin)) {
    return NextResponse.redirect(`${preferredOrigin}${currentUrl.pathname}${currentUrl.search}`, 308)
  }

  // Only touch Supabase auth for routes that need auth decisions.
  const isProtectedRoute = pathname.startsWith('/dashboard')
  const isAuthPage = pathname === '/login' || pathname === '/signup'

  if (!isProtectedRoute && !isAuthPage) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  let userRole = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user || null

    if (user?.id) {
      const { data: userRecord } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      userRole = desiredRoleForEmail(user.email || '', userRecord?.role || null)
    }
  } catch {
    // Network/auth provider temporary issues should not hard-crash middleware.
    user = null
    userRole = null
  }

  // Redirect unauthenticated users
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isProtectedRoute && (!userRole || !VALID_ROLES.includes(userRole))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const routePolicy = isProtectedRoute ? getDashboardRoutePolicy(pathname) : null
  if (routePolicy && !routePolicy.roles.includes(userRole || '')) {
    const redirectUrl = new URL('/dashboard', request.url)
    redirectUrl.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPage && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
