import axios, { AxiosError, InternalAxiosRequestConfig, AxiosRequestConfig, AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Store abort controllers for request cancellation
const abortControllers = new Map<string, AbortController>();

/**
 * Generate a unique key for a request
 */
function getRequestKey(config: InternalAxiosRequestConfig): string {
  const method = config.method?.toUpperCase() || 'GET';
  const url = config.url || '';
  const params = JSON.stringify(config.params || {});
  const data = JSON.stringify(config.data || {});
  return `${method}:${url}:${params}:${data}`;
}

/**
 * Create an API instance with interceptors
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  // Default timeout of 30 seconds
  timeout: 30000,
});

/**
 * Response validation schema
 */
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/**
 * Validate API response structure
 */
function validateResponse<T>(response: AxiosResponse): AxiosResponse<T> {
  // Check if response has expected structure
  if (!response.data || typeof response.data !== 'object') {
    console.warn('Unexpected response format:', response.data);
    return response;
  }

  const data = response.data as ApiResponse<T>;

  // If response has explicit success: false, treat as error
  if (data.success === false) {
    const error = new Error(data.message || data.error || 'API request failed') as AxiosError;
    error.response = response;
    throw error;
  }

  return response;
}

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      // Handle both AxiosHeaders (axios v1+) and plain object headers
      if (typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Create AbortController for this request
    const requestKey = getRequestKey(config);
    const controller = new AbortController();
    abortControllers.set(requestKey, controller);

    // Attach signal to config
    config.signal = controller.signal;

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

/**
 * Set the refresh token function from AuthContext
 * This avoids circular dependency
 */
export function setTokenRefresher(refresher: () => Promise<void>) {
  refreshPromise = refresher();
}

/**
 * Handle 401 errors with token refresh
 */
async function handle401Error(error: AxiosError): Promise<AxiosError | unknown> {
  // Don't refresh for auth endpoints
  const url = error.config?.url || '';
  if (url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh')) {
    localStorage.removeItem('token');
    if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }

  // Try to refresh token
  if (!isRefreshing && refreshPromise) {
    isRefreshing = true;
    try {
      await refreshPromise;
      isRefreshing = false;
      // Retry the original request
      return api.request(error.config!);
    } catch (refreshError) {
      isRefreshing = false;
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    }
  } else if (isRefreshing) {
    // Wait for the ongoing refresh to complete
    try {
      await refreshPromise;
      return api.request(error.config!);
    } catch {
      return Promise.reject(error);
    }
  }

  // No refresh function available, redirect to login
  localStorage.removeItem('token');
  if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
    window.location.href = '/login';
  }
  return Promise.reject(error);
}

api.interceptors.response.use(
  (response) => {
    // Clean up abort controller
    const requestKey = getRequestKey(response.config);
    abortControllers.delete(requestKey);

    // Validate response
    return validateResponse(response);
  },
  (error: AxiosError) => {
    // Clean up abort controller
    if (error.config) {
      const requestKey = getRequestKey(error.config);
      abortControllers.delete(requestKey);
    }

    // Don't treat cancellation as error
    if (axios.isCancel(error)) {
      console.log('Request cancelled:', error.message);
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      return handle401Error(error);
    }
    return Promise.reject(error);
  }
);

/**
 * Cancel a specific request by key
 */
export function cancelRequest(key: string): void {
  const controller = abortControllers.get(key);
  if (controller) {
    controller.abort();
    abortControllers.delete(key);
  }
}

/**
 * Cancel all pending requests
 */
export function cancelAllRequests(): void {
  abortControllers.forEach((controller) => {
    controller.abort();
  });
  abortControllers.clear();
}

/**
 * Create a request with AbortController support
 */
export function createCancellableRequest<T>(
  config: AxiosRequestConfig
): { promise: Promise<AxiosResponse<T>>; cancel: () => void } {
  const controller = new AbortController();
  const requestKey = `${config.method?.toUpperCase() || 'GET'}:${config.url || ''}`;
  abortControllers.set(requestKey, controller);

  const promise = api.request<T>({
    ...config,
    signal: controller.signal,
  });

  const cancel = () => {
    controller.abort();
    abortControllers.delete(requestKey);
  };

  return { promise, cancel };
}

export default api;

export const apiEndpoints = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    me: '/auth/me',
    profile: '/auth/profile',
    refresh: '/auth/refresh',
  },
  handwriting: {
    profiles: '/handwriting/profiles',
    analyze: (id: string) => `/handwriting/profiles/${id}/analyze`,
    samples: (id: string) => `/handwriting/profiles/${id}/samples`,
    update: (id: string) => `/handwriting/profiles/${id}`,
    delete: (id: string) => `/handwriting/profiles/${id}`,
  },
  assignments: {
    list: '/assignments',
    create: '/assignments',
    get: (id: string) => `/assignments/${id}`,
    update: (id: string) => `/assignments/${id}`,
    delete: (id: string) => `/assignments/${id}`,
    generate: (id: string) => `/assignments/${id}/generate`,
    preview: (id: string) => `/assignments/${id}/preview`,
    pdf: (id: string) => `/assignments/${id}/pdf`,
    docx: (id: string) => `/assignments/${id}/docx`,
    questions: (id: string) => `/assignments/${id}/questions`,
  },
  ai: {
    generateAnswer: '/ai/generate-answer',
    generateAnswers: '/ai/generate-answers',
    ocr: '/ai/ocr',
    subjects: '/ai/subjects',
  },
  dashboard: {
    stats: '/dashboard/stats',
    recent: '/dashboard/recent',
    activity: '/dashboard/activity',
  },
  files: {
    upload: '/files/upload',
    delete: (id: string) => `/files/${id}`,
  },
};

export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    // Don't show error for cancelled requests
    if (axios.isCancel(error)) {
      return 'Request cancelled';
    }
    return error.response?.data?.message || error.message || 'An error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
};