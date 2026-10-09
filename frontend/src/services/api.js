import axios from "axios";

const normalizeApiBase = (raw) => {
  try {
    if (!raw) return "http://localhost:5000/api";
    // If starts with port-only like ":5000" or ":5000/api", prepend origin protocol and hostname
    if (/^:\d+/.test(raw)) return `${window.location.protocol}//${window.location.hostname}${raw}`;
    // If protocol-relative like "//host:port" add protocol
    if (/^\/\//.test(raw)) return `${window.location.protocol}:${raw}`;
    // If missing protocol (e.g., "localhost:5000" or "localhost:5000/api"), add protocol
    if (!/^https?:\/\//.test(raw)) return `${window.location.protocol}//${raw}`;
    return raw.replace(/\/$/, "");
  } catch (e) {
    return "http://localhost:5000/api";
  }
};

const apiBase = normalizeApiBase(import.meta.env.VITE_API_URL || "http://localhost:5000/api");

const api = axios.create({
  baseURL: apiBase,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  config.headers = config.headers || {};

  if (token) {
    config.headers.Authorization = "Bearer " + token;
  }

  if (config.data instanceof FormData) {
    config.headers["Content-Type"] = undefined;
    config.headers["content-type"] = undefined;
    if (config.headers.common) {
      config.headers.common["Content-Type"] = undefined;
      config.headers.common["content-type"] = undefined;
    }
  } else {
    config.headers["Content-Type"] = "application/json";
  }

  return config;
});

// Global response handler: if backend returns 401/403, clear auth and redirect appropriately
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      try {
        // clear tokens only if server says unauthorized/forbidden
        localStorage.removeItem('token');
        // keep profile for non-admins, but remove user
        localStorage.removeItem('user');
        localStorage.removeItem('profile');
      } catch (e) {
        // ignore
      }

      // If on admin routes, redirect to admin-login; otherwise redirect to /login
      const current = window.location.pathname || '/';
      if (current.startsWith('/admin')) {
        window.location.href = '/admin-login';
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
