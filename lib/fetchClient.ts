export type FetchOptions = RequestInit & { referer?: string };

const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  'Accept': 'application/json',
  'Origin': process.env.NEXT_PUBLIC_API_URL || 'https://m5.microlent.com',
  'Referer': process.env.NEXT_PUBLIC_API_URL || 'https://m5.microlent.com/',
};

export async function fetchWithDefaults(input: RequestInfo, init?: FetchOptions) {
  const headers = new Headers(DEFAULT_HEADERS);

  // Merge user-provided headers
  if (init && init.headers) {
    const provided = new Headers(init.headers as HeadersInit);
    provided.forEach((v, k) => headers.set(k, v));
  }

  // If a token exists in localStorage and no explicit Authorization provided, attach it
  try {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token && !headers.get('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
  } catch (e) {
    // ignore
  }

  // If we have a body and Content-Type not set, default to JSON
  if (init && init.body && !headers.get('Content-Type')) {
    // Let FormData be untouched
    if (!(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const merged: RequestInit = {
    ...init,
    headers,
  };

  return fetch(input, merged);
}

export default fetchWithDefaults;
