export const AUTH_TOKEN_COOKIE = 'ukmac_auth_token';
export const AUTH_REFRESH_TOKEN_COOKIE = 'ukmac_refresh_token';
export const AUTH_REMEMBER_MAX_AGE = 60 * 60 * 24 * 30;

export function getAuthApiBaseUrl() {
  return (process.env.AUTH_API_BASE_URL ?? 'http://127.0.0.1:8000').replace(
    /\/+$/,
    ''
  );
}
