import axios from 'axios';

// All requests go through the Vite proxy to the Express server, with cookies.
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

let isRefreshing = false;
let queue = [];

function flushQueue(error) {
  queue.forEach((p) => (error ? p.reject(error) : p.resolve()));
  queue = [];
}

// On a 401, try a single silent refresh, then replay the original request.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url || '';

    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/signup') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/me');

    if (status === 401 && !original._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject })).then(() =>
          api(original)
        );
      }
      original._retry = true;
      isRefreshing = true;
      try {
        await api.post('/auth/refresh');
        flushQueue(null);
        return api(original);
      } catch (err) {
        flushQueue(err);
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Extract a human-readable message from an axios error.
export function apiError(err, fallback = 'Something went wrong') {
  return err?.response?.data?.error || err?.message || fallback;
}
