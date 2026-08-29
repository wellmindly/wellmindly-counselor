import axios from 'axios';

let rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
if (rawApiUrl.endsWith('/')) rawApiUrl = rawApiUrl.slice(0, -1);
if (!rawApiUrl.endsWith('/api')) rawApiUrl += '/api';
export const API_BASE = `${rawApiUrl}/v1`;

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
