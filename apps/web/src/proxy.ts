import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/', '/login', '/register', '/events', '/forgot-password', '/reset-password', '/verify-email', '/about', '/pricing', '/become-organiser', '/cart', '/checkout', '/checkout/success'];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith('/events/'),
  ) || pathname.startsWith('/reset-password') || pathname.startsWith('/verify/');

  if (isPublicPath) return NextResponse.next();

  const refreshToken = request.cookies.get('refreshToken')?.value;

  if (!refreshToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
