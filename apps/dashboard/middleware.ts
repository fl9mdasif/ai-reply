import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

const intlMiddleware = createMiddleware(routing);

function decodeJwtPayload(token: string): { sub?: string; role?: string; exp?: number } | null {
  try {
    const [, payload] = token.split('.');
    const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    return JSON.parse(json) as { sub?: string; role?: string; exp?: number };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let next-intl handle locale routing first
  const intlResponse = intlMiddleware(request);

  // Extract locale from pathname (e.g. /en/seller -> en)
  const localeMatch = pathname.match(/^\/(en|bn)(\/|$)/);
  const locale = localeMatch ? localeMatch[1] : 'en';

  const isSellerRoute = pathname.match(/^\/(en|bn)\/seller/);
  const isAdminRoute = pathname.match(/^\/(en|bn)\/admin/);

  if (!isSellerRoute && !isAdminRoute) {
    return intlResponse;
  }

  const token = request.cookies.get('jba_auth')?.value;

  if (!token) {
    return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
  }

  const payload = decodeJwtPayload(token);

  if (!payload || !payload.exp || payload.exp * 1000 < Date.now()) {
    const res = NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
    res.cookies.delete('jba_auth');
    return res;
  }

  if (isAdminRoute && payload.role !== 'admin') {
    return NextResponse.redirect(new URL(`/${locale}/seller`, request.url));
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
