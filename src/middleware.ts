import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('perkasa-finance-auth')
  const { pathname } = request.nextUrl

  // Define protected routes
  const protectedRoutes = [
    '/dashboard',
    '/employees',
    '/attendance',
    '/salary',
    '/loans',
    '/permissions',
    '/master-data',
    '/settings',
    '/reports',
    '/notifications'
  ]

  // Check if current path is protected
  const isProtected = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtected && !authCookie) {
    const loginUrl = new URL('/', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // If user is already logged in and tries to access login page, redirect to dashboard
  if (pathname === '/' && authCookie) {
    const dashboardUrl = new URL('/dashboard', request.url)
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - uploads (public uploads)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|uploads).*)',
  ],
}
