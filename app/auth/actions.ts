'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  AUTH_REFRESH_TOKEN_COOKIE,
  AUTH_REMEMBER_COOKIE,
  AUTH_REMEMBER_MAX_AGE,
  AUTH_TOKEN_COOKIE,
  getAuthApiBaseUrl,
} from '@/app/lib/auth';

type LoginState = {
  error?: string;
  success?: boolean;
};

type JsonObject = Record<string, unknown>;

const TOKEN_KEYS = ['access_token', 'accessToken', 'token', 'jwt', 'id_token'];
const NESTED_TOKEN_KEYS = ['data', 'session', 'auth', 'user'];

export async function handleLoginAction(
  _prevState: LoginState | null,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const remember = formData.get('remember') === 'on';

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  let response: Response;

  try {
    response = await fetch(`${getAuthApiBaseUrl()}/auth/login`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
  } catch {
    return { error: 'Could not connect to the backend auth service.' };
  }

  const payload = await readResponseBody(response);

  if (!response.ok) {
    return { error: getErrorMessage(payload) ?? 'Authentication failed.' };
  }

  const loginPayload = getLoginPayload(payload);
  const token = loginPayload?.accessToken ?? getToken(payload);
  const refreshToken = loginPayload?.refreshToken ?? null;

  if (!token) {
    return { error: 'Login succeeded, but no auth token was returned.' };
  }

  if (loginPayload?.tokenType && loginPayload.tokenType.toLowerCase() !== 'bearer') {
    return { error: `Unsupported token type: ${loginPayload.tokenType}.` };
  }

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(remember ? { maxAge: AUTH_REMEMBER_MAX_AGE } : {}),
  } as const;

  const cookieStore = await cookies();
  cookieStore.set({
    name: AUTH_TOKEN_COOKIE,
    value: token,
    ...cookieOptions,
  });

  if (refreshToken) {
    cookieStore.set({
      name: AUTH_REFRESH_TOKEN_COOKIE,
      value: refreshToken,
      ...cookieOptions,
    });
  }

  cookieStore.set({
    name: AUTH_REMEMBER_COOKIE,
    value: remember ? '1' : '0',
    ...cookieOptions,
  });

  redirect('/dashboard');
}

export async function handleLogoutAction() {
  const cookieStore = await cookies();

  cookieStore.delete(AUTH_TOKEN_COOKIE);
  cookieStore.delete(AUTH_REFRESH_TOKEN_COOKIE);
  cookieStore.delete(AUTH_REMEMBER_COOKIE);

  redirect('/auth');
}

async function readResponseBody(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return (await response.json().catch(() => null)) as unknown;
  }

  return response.text().catch(() => null);
}

function getToken(value: unknown): string | null {
  if (!isObject(value)) {
    return null;
  }

  for (const key of TOKEN_KEYS) {
    const token = value[key];

    if (typeof token === 'string' && token.length > 0) {
      return token;
    }
  }

  for (const key of NESTED_TOKEN_KEYS) {
    const nestedToken = getToken(value[key]);

    if (nestedToken) {
      return nestedToken;
    }
  }

  return null;
}

function getLoginPayload(value: unknown) {
  if (!isObject(value)) {
    return null;
  }

  const accessToken = value.access_token;
  const refreshToken = value.refresh_token;
  const tokenType = value.token_type;

  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    return null;
  }

  return {
    accessToken,
    refreshToken:
      typeof refreshToken === 'string' && refreshToken.length > 0
        ? refreshToken
        : null,
    tokenType: typeof tokenType === 'string' ? tokenType : null,
  };
}

function getErrorMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (!isObject(value)) {
    return null;
  }

  for (const key of ['detail', 'message', 'error']) {
    const message = value[key];

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    if (Array.isArray(message) && message.length > 0) {
      return 'Please check the login details and try again.';
    }
  }

  return null;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
