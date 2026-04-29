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

// Helper to decode JWT payload without external dependencies
function decodeJwtPayload(token: string) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64').toString());
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  if (!isValidOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      );
    }

    // Create a server-side gRPC client (cannot reuse the browser-based authClient)
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

    const loginResponse = await client.login({ email, password });
    const { token, refresh } = loginResponse;

    // Decode the access token to extract user info
    const decoded = decodeJwtPayload(token);
    const userId = decoded?.resource_id || decoded?.sub || '';

    // Build the response with user info the client needs
    const response = NextResponse.json({
      accessToken: token,
      userId,
      email,
    });

    // Set httpOnly cookies so refresh tokens stay server-side only
    response.cookies.set(ACCESS_COOKIE, token, {
      ...COOKIE_OPTIONS,
      maxAge: ACCESS_MAX_AGE,
    });

    response.cookies.set(REFRESH_COOKIE, refresh, {
      ...COOKIE_OPTIONS,
      maxAge: REFRESH_MAX_AGE,
    });

    return response;
  } catch (err: any) {
    const message = err?.message || 'Login failed';
    const status = message.includes('PERMISSION_DENIED') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
