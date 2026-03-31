import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '@/types/api';
import { isTokenExpiringSoon } from '@/lib/auth-helpers';

// Use the server-side proxy to avoid CORS issues in preview/production
const API_BASE_URL = typeof window !== 'undefined'
  ? '/api/proxy'
  : (process.env.NEXT_PUBLIC_API_URL ?? 'https://apisamp.gruslin.tech/api/v1');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Helper to get auth store (lazy import to avoid circular deps)
function getAuthStore() {
  if (typeof window === 'undefined') return null;
  try {
    const { useAuthStore } = require('@/stores/auth-store');
    return useAuthStore?.getState?.() ?? null;
  } catch {
    return null;
  }
}

// Track if we're currently refreshing to avoid loops
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

function getRefreshUrl() {
  return typeof window !== 'undefined'
    ? '/api/proxy/auth/refresh'
    : `${API_BASE_URL}/auth/refresh`;
}

async function doRefresh(): Promise<string | null> {
  const store = getAuthStore();
  const refreshToken = store?.refreshToken;

  if (!refreshToken) {
    store?.logout?.();
    if (typeof window !== 'undefined') window.location.href = '/login';
    return null;
  }

  try {
    const { data } = await axios.post(getRefreshUrl(), {
      refresh_token: refreshToken,
    });
    const newAccessToken = data?.access_token ?? '';
    const newRefreshToken = data?.refresh_token ?? '';
    store?.refreshSession?.(newAccessToken, newRefreshToken);
    return newAccessToken;
  } catch {
    store?.logout?.();
    if (typeof window !== 'undefined') window.location.href = '/login';
    return null;
  }
}

/**
 * Ensures the access token is fresh. If expiring soon, refreshes proactively.
 * All concurrent callers share the same refresh promise.
 */
async function ensureFreshToken(): Promise<string | null> {
  const store = getAuthStore();
  if (!store?.accessToken) return null;

  // If not expiring soon, return current token
  if (!isTokenExpiringSoon(store.accessToken, 60)) {
    return store.accessToken;
  }

  // Already refreshing - wait for the shared promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = doRefresh().finally(() => {
    isRefreshing = false;
    refreshPromise = null;
  });

  return refreshPromise;
}

// Request interceptor: proactively refresh token if expiring, then attach headers
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const store = getAuthStore();

    // Skip proactive refresh for auth endpoints (login, refresh itself)
    const url = config.url ?? '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh');

    if (store?.accessToken && !isAuthEndpoint) {
      const token = await ensureFreshToken();
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
    } else if (store?.accessToken) {
      config.headers.set('Authorization', `Bearer ${store.accessToken}`);
    }

    if (store?.contextToken) {
      // The backend expects the raw context token value.
      const ctxValue = store.contextToken.replace(/^Bearer\s+/i, '').trim();
      if (ctxValue) {
        config.headers.set('X-Context-Token', ctxValue);
      }
    }

    // Send X-Zone-Id: superadmin override takes priority, then context-based zone
    const zoneId = store?.superadminSelectedZone?.id || store?.currentZone?.id;
    if (zoneId) {
      config.headers.set('X-Zone-Id', zoneId);
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor: handle 401 as fallback (in case proactive refresh missed)
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error?.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      const newToken = await ensureFreshToken();
      if (newToken && originalRequest?.headers) {
        originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
        return apiClient(originalRequest);
      }

      // Refresh failed - already handled in doRefresh
      return Promise.reject(error);
    }

    // Normalize error
    const responseData = error?.response?.data as ApiError | undefined;
    const apiError: ApiError = {
      detail: (typeof responseData?.detail === 'string'
        ? responseData.detail
        : error?.message) ?? 'An unexpected error occurred',
      error_code: responseData?.error_code,
      field_errors: Array.isArray(responseData?.detail)
        ? (responseData?.detail as any)
        : undefined,
      status: error?.response?.status,
      response: {
        status: error?.response?.status,
        data: responseData,
      },
    };

    return Promise.reject(apiError);
  }
);

export default apiClient;
