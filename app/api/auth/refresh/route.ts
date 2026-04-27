import { NextRequest, NextResponse } from 'next/server';
import { isValidOrigin } from '@/lib/validate-origin';
import { createChannel, createClient, FetchTransport } from 'nice-grpc-web';
import { AuthServiceDefinition } from '@modules/grpc/library/blockjoy/v1/auth';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};
const ACCESS_COOKIE = 'bv-token';
const REFRESH_COOKIE = 'bv-refresh';
const ACCESS_MAX_AGE = 60 * 60; // 1 hour
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export async function POST(request: NextRequest) {
  if (!isValidOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  try {
    const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
    const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL;
    if (!apiUrl) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 },
      );
    }

    const channel = createChannel(
      apiUrl,
      FetchTransport({ credentials: 'include' }),
    );
    const client = createClient(AuthServiceDefinition, channel);

    const refreshResponse = await client.refresh({
      token: accessToken || '',
      refresh: refreshToken,
    });

    const { token: newToken, refresh: newRefresh } = refreshResponse;

    const response = NextResponse.json({ accessToken: newToken });

    // Update both cookies with fresh tokens
    response.cookies.set(ACCESS_COOKIE, newToken, {
      ...COOKIE_OPTIONS,
      maxAge: ACCESS_MAX_AGE,
    });

    response.cookies.set(REFRESH_COOKIE, newRefresh, {
      ...COOKIE_OPTIONS,
      maxAge: REFRESH_MAX_AGE,
    });

    return response;
  } catch (err: any) {
    // Clear cookies on refresh failure — session is dead
    const response = NextResponse.json(
      { error: 'Session expired' },
      { status: 401 },
    );
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return response;
  }
}
