import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  AUTH_REFRESH_TOKEN_COOKIE,
  AUTH_REMEMBER_COOKIE,
  AUTH_REMEMBER_MAX_AGE,
  AUTH_TOKEN_COOKIE,
  getAuthApiBaseUrl,
} from '@/app/lib/auth';

type RefreshedSession = {
  access_token: string;
  refresh_token?: string | null;
  token_type?: string;
};

const TOKEN_REFRESH_WINDOW_SECONDS = 60;

export async function proxy(request: NextRequest) {
  const accessToken = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(AUTH_REFRESH_TOKEN_COOKIE)?.value;

  if (accessToken && isTokenFresh(accessToken)) {
    return NextResponse.next();
  }

  if (!refreshToken) {
    return clearSessionAndRedirect(request);
  }

  const session = await refreshSession(refreshToken);

  if (!session) {
    return clearSessionAndRedirect(request);
  }

  const rotatedRefreshToken = session.refresh_token || refreshToken;
  request.cookies.set(AUTH_TOKEN_COOKIE, session.access_token);
  request.cookies.set(AUTH_REFRESH_TOKEN_COOKIE, rotatedRefreshToken);

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  const remember = request.cookies.get(AUTH_REMEMBER_COOKIE)?.value === '1';
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    ...(remember ? { maxAge: AUTH_REMEMBER_MAX_AGE } : {}),
  };

  response.cookies.set({
    name: AUTH_TOKEN_COOKIE,
    value: session.access_token,
    ...cookieOptions,
  });
  response.cookies.set({
    name: AUTH_REFRESH_TOKEN_COOKIE,
    value: rotatedRefreshToken,
    ...cookieOptions,
  });

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};

async function refreshSession(refreshToken: string): Promise<RefreshedSession | null> {
  try {
    const response = await fetch(`${getAuthApiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Partial<RefreshedSession>;

    if (!payload.access_token) {
      return null;
    }

    return payload as RefreshedSession;
  } catch {
    return null;
  }
}

function isTokenFresh(token: string) {
  try {
    const encodedPayload = token.split('.')[1];

    if (!encodedPayload) {
      return false;
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as { exp?: number };

    return (
      typeof payload.exp === 'number' &&
      payload.exp > Math.floor(Date.now() / 1000) + TOKEN_REFRESH_WINDOW_SECONDS
    );
  } catch {
    return false;
  }
}

function clearSessionAndRedirect(request: NextRequest) {
  const loginUrl = new URL('/auth', request.url);
  loginUrl.searchParams.set('reason', 'session-expired');

  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(AUTH_TOKEN_COOKIE);
  response.cookies.delete(AUTH_REFRESH_TOKEN_COOKIE);
  response.cookies.delete(AUTH_REMEMBER_COOKIE);
  return response;
}
