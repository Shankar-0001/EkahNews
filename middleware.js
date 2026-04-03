import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

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

export async function middleware(request) {
  const pathname = request.nextUrl.pathname
  const preferredOrigin = getPreferredOrigin()
  const currentUrl = request.nextUrl.clone()

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
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user || null
  } catch {
    // Network/auth provider temporary issues should not hard-crash middleware.
    user = null
  }

  // Redirect unauthenticated users
  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
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
