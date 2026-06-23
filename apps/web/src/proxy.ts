import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
