import axios from 'axios';

export const API_BASE = 'http://localhost:5000/api/v1';

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
