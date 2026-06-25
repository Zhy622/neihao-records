import { AuthSession } from '../types/auth';
import {
  clearSession,
  getCurrentSession,
  loadSession,
  saveSession,
} from '../auth/session-store';

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
export const API_BASE_URL = configuredBaseUrl ?? 'http://localhost:3001/api';

type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

type ApiErrorBody = {
  message?: string | string[];
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let refreshPromise: Promise<AuthSession> | null = null;

const getErrorMessage = (body: unknown, fallback: string) => {
  if (!body || typeof body !== 'object') {
    return fallback;
  }

  const message = (body as ApiErrorBody).message;
  return Array.isArray(message) ? message.join('\n') : message ?? fallback;
};

const parseResponseBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

async function sendRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const body = await parseResponseBody(response);

    if (!response.ok) {
      throw new ApiError(
        getErrorMessage(body, `Request failed with status ${response.status}.`),
        response.status,
      );
    }

    return body as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError('无法连接服务器，请检查网络和 API 地址。', 0);
  }
}

export function publicApiRequest<T>(path: string, options: ApiRequestOptions = {}) {
  return sendRequest<T>(path, options);
}

export async function refreshAuthSession(): Promise<AuthSession> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const session = getCurrentSession() ?? (await loadSession());
    if (!session) {
      throw new ApiError('登录状态已失效，请重新登录。', 401);
    }

    try {
      const refreshed = await sendRequest<AuthSession>('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: session.tokens.refreshToken },
      });
      await saveSession(refreshed);
      return refreshed;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearSession();
      }

      throw error;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
  canRetry = true,
): Promise<T> {
  const session = getCurrentSession() ?? (await loadSession());
  if (!session) {
    throw new ApiError('请先登录。', 401);
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${session.tokens.accessToken}`);

  try {
    return await sendRequest<T>(path, { ...options, headers });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !canRetry) {
      throw error;
    }

    const refreshed = await refreshAuthSession();
    const retryHeaders = new Headers(options.headers);
    retryHeaders.set('Authorization', `Bearer ${refreshed.tokens.accessToken}`);
    return apiRequest<T>(path, { ...options, headers: retryHeaders }, false);
  }
}
