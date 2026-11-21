export type AuthUser = { id: string; email: string; role: string };
export type TokenPair = { accessToken: string; refreshToken: string };

const ACCESS_KEY = 'ic_access_token';
const REFRESH_KEY = 'ic_refresh_token';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getTokens(): { access: string | null; refresh: string | null } {
  if (typeof window === 'undefined') return { access: null, refresh: null };
  try {
    return {
      access: window.localStorage.getItem(ACCESS_KEY),
      refresh: window.localStorage.getItem(REFRESH_KEY),
    };
  } catch {
    return { access: null, refresh: null };
  }
}

export function saveTokens(t: TokenPair) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACCESS_KEY, t.accessToken);
    window.localStorage.setItem(REFRESH_KEY, t.refreshToken);
  } catch {
    // storage unavailable: the user will simply have to log in again
  }
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  } catch {
    // nothing to clear
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    const raw = (data as { message?: unknown } | null)?.message;
    const message = Array.isArray(raw)
      ? raw.join(', ')
      : typeof raw === 'string'
        ? raw
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

type Options = { method?: string; body?: unknown; auth?: boolean };

async function send(
  path: string,
  opts: Options,
  accessToken: string | null,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.auth && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  try {
    return await fetch(`/api${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the API running?');
  }
}

// Only one refresh runs at a time, because refresh tokens are single-use.
let refreshing: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const { refresh } = getTokens();
  if (!refresh) return false;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: refresh }),
          cache: 'no-store',
        });
        if (!res.ok) {
          clearTokens();
          return false;
        }
        saveTokens((await res.json()) as TokenPair);
        return true;
      } catch {
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  let res = await send(path, opts, getTokens().access);
  if (res.status === 401 && opts.auth) {
    if (await refreshTokens()) {
      res = await send(path, opts, getTokens().access);
    }
  }
  return parseResponse<T>(res);
}
