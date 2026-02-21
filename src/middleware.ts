import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('perkasa-finance-auth')
  const { pathname } = request.nextUrl

  // 1. Define Public Routes (No Auth Required)
  const publicRoutes = [
    '/',
    '/api/auth/login',
    '/api/auth/logout',
  ]

  if (publicRoutes.includes(pathname)) {
    // If logged in and visiting login page, redirect to dashboard
    if (pathname === '/' && authCookie) {
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
    return NextResponse.next()
  }

  // 2. Check Authentication (Cookie existence)
  if (!authCookie) {
    // If API request, return 401
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // If UI request, redirect to login
    const loginUrl = new URL('/', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // 3. Parse User Role
  let userRole = null
  try {
    const userData = JSON.parse(authCookie.value)
    userRole = userData.role
  } catch (e) {
    // Invalid cookie
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Invalid Session' }, { status: 401 })
    }
    const loginUrl = new URL('/', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // 4. RBAC Rules
  const isAdmin = ['ADMIN', 'DEVELOPER', 'ADMINISTRATOR'].includes(userRole)
  // const isEmployee = ['EMPLOYEE', 'KARYAWAN'].includes(userRole)

  // Restricted Routes for Non-Admins
  const adminOnlyRoutes = [
    '/master-data',
    '/settings',
    '/reports',
    '/api/master-data',
    '/api/settings',
    '/api/reports',
    '/api/users', // User management
    '/api/machine' // Machine management
  ]

  if (!isAdmin) {
    if (adminOnlyRoutes.some(route => pathname.startsWith(route))) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const dashboardUrl = new URL('/dashboard', request.url)
      return NextResponse.redirect(dashboardUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - uploads (public uploads)
     */
    '/((?!_next/static|_next/image|favicon.ico|uploads).*)',
  ],
}
