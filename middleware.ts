import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const adminProtected = [
  '/admin/dashboard',
  '/admin/gallery',
  '/admin/services',
  '/admin/bookings',
  '/admin/invoices',
  '/admin/settings',
  '/admin/mailing-list',
  '/admin/waitlist',
  '/admin/looks',
  '/admin/lookbooks',
  '/admin/calendar',
  '/admin/clients',
  '/admin/messages'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (adminProtected.some((p) => pathname.startsWith(p))) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/dashboard/:path*',
    '/admin/gallery/:path*',
    '/admin/services/:path*',
    '/admin/bookings/:path*',
    '/admin/invoices/:path*',
    '/admin/settings/:path*',
    '/admin/mailing-list/:path*',
    '/admin/waitlist/:path*',
    '/admin/looks/:path*',
    '/admin/lookbooks/:path*',
    '/admin/calendar/:path*',
    '/admin/clients/:path*',
    '/admin/messages/:path*'
  ]
}
