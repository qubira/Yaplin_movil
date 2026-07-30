const API_BASE_URL = 'https://yaplin-movil.onrender.com';

let authToken: string | null = null;

export function setApiToken(token: string | null) {
  authToken = token;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  // Full parsed JSON body of the error response (when the server sent one),
  // so callers can read fields beyond `error`/`code` — e.g. anything else a
  // specific endpoint might attach to a 409/403 payload — without this class
  // needing to know about every endpoint's shape ahead of time.
  body: Record<string, unknown> | null;
  constructor(status: number, message: string, code?: string, body: Record<string, unknown> | null = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

const ACCOUNT_BLOCK_CODES = new Set(['ACCOUNT_SUSPENDED', 'ACCOUNT_EXPIRED']);

let onAccountBlocked: ((code: string, message: string) => void) | null = null;

export function setAccountBlockedHandler(fn: typeof onAccountBlocked) {
  onAccountBlocked = fn;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data && data.error) || `Error ${res.status}`;
    const code: string | undefined = data && data.code;
    if (code && ACCOUNT_BLOCK_CODES.has(code)) {
      onAccountBlocked?.(code, message);
    }
    throw new ApiError(res.status, message, code, data && typeof data === 'object' ? data : null);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
