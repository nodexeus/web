import { NextRequest, NextResponse } from 'next/server';
import { isValidOrigin } from '@/lib/validate-origin';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

const ACCESS_COOKIE = 'bv-token';
const REFRESH_COOKIE = 'bv-refresh';

export async function POST(request: NextRequest) {
  if (!isValidOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set(ACCESS_COOKIE, '', {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });

  response.cookies.set(REFRESH_COOKIE, '', {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });

  return response;
}
