import axios from 'axios';

let rawApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://api.wellmindly.com/api' : 'http://localhost:5000/api');
if (rawApiUrl.endsWith('/')) rawApiUrl = rawApiUrl.slice(0, -1);
if (!rawApiUrl.endsWith('/api')) rawApiUrl += '/api';
export const API_BASE = `${rawApiUrl}/v1`;

export const resolveAvatarUrl = (url?: string | null): string => {
  if (!url) return '';
  if (url.includes('.amazonaws.com/')) {
    let key = url.split('.amazonaws.com/')[1]?.split('?')[0];
    if (key?.startsWith('wellmindly-assets/')) {
      key = key.replace(/^wellmindly-assets\//, '');
    }
    if (key) {
      url = `/api/v1/counselors/assets/${key}`;
    }
  }
  if (url.startsWith('/api/')) {
    const backendOrigin = rawApiUrl.replace(/\/api\/?$/, '');
    return encodeURI(`${backendOrigin}${url}`);
  }
  return encodeURI(url);
};

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('counselor_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Fired when the API rejects the stored token (expired after 7 days, revoked,
 * or the account was removed). AuthContext listens and signs the counselor out.
 * Without this the portal kept rendering with a dead token: every request 401'd
 * silently, and the dashboard read "Welcome back, !" with zero sessions - which
 * looks exactly like an empty diary rather than a login problem.
 */
export const SESSION_EXPIRED_EVENT = 'counselor:session-expired';

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const hadToken = Boolean(error?.config?.headers?.Authorization);
    // Only a request that carried a token can mean "your session is gone"; a 401
    // from /login with a wrong password must stay an inline form error.
    if (status === 401 && hadToken && localStorage.getItem('counselor_token')) {
      localStorage.removeItem('counselor_token');
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

/**
 * Pull a displayable string out of an axios error.
 *
 * The API answers in two shapes: the v1 routes and the global error handler send
 * `{ error: { code, message } }`, while the older routes send `{ error: "text" }`.
 * Passing `data.error` straight into state is what broke here - React throws
 * "Objects are not valid as a React child" and takes the whole page down, so an
 * error banner turned into a blank screen.
 */
export const apiErrorMessage = (err: unknown, fallback: string): string => {
  const payload = (err as { response?: { data?: { error?: unknown; message?: unknown } } })?.response?.data;
  const error = payload?.error;

  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message;

  return fallback;
};
