import { cookies } from 'next/headers';
import { AUTH_TOKEN_COOKIE, getAuthApiBaseUrl } from '@/app/lib/auth';

export type PostType = {
  id: number;
  name: string;
  slug: string;
};

export type PostImage = {
  id: string;
  image_url: string;
  image_role: 'cover' | 'gallery';
  caption?: string | null;
  sort_order?: number | null;
};

export type AdminPost = {
  id: string;
  title: string;
  slug?: string | null;
  content?: string | null;
  type_id?: number | null;
  type_slug?: string | null;
  type?: PostType | null;
  cover_image?: string | null;
  published?: boolean | null;
  featured?: boolean | null;
  images?: PostImage[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type DashboardPostsData = {
  posts: AdminPost[];
  postTypes: PostType[];
  postsError?: string;
  postTypesError?: string;
};

export const FALLBACK_POST_TYPES: PostType[] = [
  { id: 1, name: 'Announcement', slug: 'announcement' },
  { id: 2, name: 'News', slug: 'news' },
  { id: 3, name: 'Hiring', slug: 'hiring' },
  { id: 4, name: 'Event', slug: 'event' },
];

export async function getDashboardPostsData(): Promise<DashboardPostsData> {
  const [postTypesResult, postsResult] = await Promise.all([
    fetchPostTypes(),
    fetchAdminPosts(),
  ]);

  return {
    postTypes: postTypesResult.data.length
      ? postTypesResult.data
      : FALLBACK_POST_TYPES,
    posts: postsResult.data,
    postTypesError: postTypesResult.error,
    postsError: postsResult.error,
  };
}

export async function fetchPostTypes() {
  return fetchBackendArray<PostType>('/posts/types');
}

export async function fetchAdminPosts() {
  const token = await getAuthToken();

  if (!token) {
    return { data: [], error: 'You are not logged in.' };
  }

  return fetchBackendArray<AdminPost>('/posts/admin', token);
}

export async function fetchAdminPost(postId: string) {
  if (!postId) {
    return { data: null, error: 'Choose a post to view.' };
  }

  return backendJsonRequest<AdminPost>(
    `/posts/admin/${encodeURIComponent(postId)}`
  );
}

export async function backendJsonRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<{ data: T | null; error?: string }> {
  const token = await getAuthToken();

  if (!token) {
    return { data: null, error: 'You are not logged in.' };
  }

  let response: Response;

  try {
    const isFormData = init.body instanceof FormData;

    response = await fetch(`${getAuthApiBaseUrl()}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(!isFormData && init.body ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
      cache: 'no-store',
    });
  } catch {
    return { data: null, error: 'Could not connect to the backend service.' };
  }

  const payload = await readResponseBody(response);

  if (!response.ok) {
    return {
      data: null,
      error: getErrorMessage(payload) ?? `Request failed with ${response.status}.`,
    };
  }

  return { data: (payload as T) ?? null };
}

async function fetchBackendArray<T>(path: string, token?: string) {
  let response: Response;

  try {
    response = await fetch(`${getAuthApiBaseUrl()}${path}`, {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });
  } catch {
    return { data: [] as T[], error: 'Could not connect to the backend service.' };
  }

  const payload = await readResponseBody(response);

  if (!response.ok) {
    return {
      data: [] as T[],
      error: getErrorMessage(payload) ?? `Request failed with ${response.status}.`,
    };
  }

  return { data: normalizeArray<T>(payload) };
}

async function getAuthToken() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value ?? null;
}

async function readResponseBody(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json().catch(() => null) as Promise<unknown>;
  }

  return response.text().catch(() => null);
}

function normalizeArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (isRecord(value)) {
    for (const key of ['data', 'items', 'results', 'posts']) {
      const nested = value[key];

      if (Array.isArray(nested)) {
        return nested as T[];
      }
    }
  }

  return [];
}

function getErrorMessage(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (!isRecord(value)) {
    return null;
  }

  for (const key of ['detail', 'message', 'error']) {
    const message = value[key];

    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
