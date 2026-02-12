import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from './types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - important!
  const { data: { user } } = await supabase.auth.getUser()

  // Get user profile for role-based routing
  let userProfile: { role: string; is_active: boolean } | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()
    userProfile = profile as { role: string; is_active: boolean } | null
  }

  const pathname = request.nextUrl.pathname

  // Public routes that don't require authentication
  const publicRoutes = [
    '/auth/login',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/employee/login',
    '/PWA/frozengoodspwa/login',
    '/PWA/frozengoodspwa/manifest.json',
    '/PWA/commissarypwa/login',
    '/PWA/commissarypwa/manifest.json',
  ]
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Protected route patterns
  const isAdminRoute = pathname.startsWith('/admin')
  const isEmployeeRoute = pathname.startsWith('/employee') && !pathname.startsWith('/employee/login')
  const isPWAHubRoute = pathname === '/PWA' || pathname === '/PWA/'
  const isFrozenGoodsPWARoute = pathname.startsWith('/PWA/frozengoodspwa')
    && !pathname.startsWith('/PWA/frozengoodspwa/login')
    && !pathname.startsWith('/PWA/frozengoodspwa/manifest.json')
  const isCommissaryPWARoute = pathname.startsWith('/PWA/commissarypwa')
    && !pathname.startsWith('/PWA/commissarypwa/login')
    && !pathname.startsWith('/PWA/commissarypwa/manifest.json')
  const isProtectedRoute = isAdminRoute || isEmployeeRoute || isPWAHubRoute || isFrozenGoodsPWARoute || isCommissaryPWARoute

  // Redirect unauthenticated users to appropriate login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    if (isFrozenGoodsPWARoute) {
      url.pathname = '/PWA/frozengoodspwa/login'
    } else if (isCommissaryPWARoute) {
      url.pathname = '/PWA/commissarypwa/login'
    } else if (isEmployeeRoute) {
      url.pathname = '/employee/login'
    } else {
      url.pathname = '/auth/login'
    }
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from public auth pages
  if (user && isPublicRoute) {
    const url = request.nextUrl.clone()
    // Frozen goods login -> frozen goods home
    if (pathname.startsWith('/PWA/frozengoodspwa/login')) {
      url.pathname = '/PWA/frozengoodspwa'
      return NextResponse.redirect(url)
    }
    // Commissary login -> commissary home
    if (pathname.startsWith('/PWA/commissarypwa/login')) {
      url.pathname = '/PWA/commissarypwa'
      return NextResponse.redirect(url)
    }
    // Default to admin if profile not loaded yet (public signup creates admins)
    // Only redirect to employee if we're certain they're an employee
    url.pathname = userProfile?.role === 'employee' ? '/employee' : '/admin'
    return NextResponse.redirect(url)
  }

  // Check if user account is deactivated
  if (user && userProfile && !userProfile.is_active && !pathname.startsWith('/auth/deactivated')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/deactivated'
    return NextResponse.redirect(url)
  }

  // Role-based route protection
  if (user && userProfile) {
    // PWA Hub is admin-only
    if (isPWAHubRoute && userProfile.role === 'employee') {
      const url = request.nextUrl.clone()
      url.pathname = '/employee'
      return NextResponse.redirect(url)
    }

    // Admins trying to access employee-only routes
    if (isEmployeeRoute && userProfile.role === 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }

    // Employees trying to access admin routes
    if (isAdminRoute && userProfile.role === 'employee') {
      const url = request.nextUrl.clone()
      url.pathname = '/employee'
      return NextResponse.redirect(url)
    }

    // Frozen Goods PWA: accessible by both employees and admins
    // (no role restriction needed)
  }

  return supabaseResponse
}
