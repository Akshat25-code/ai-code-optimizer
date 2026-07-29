// Single source of truth for API configuration.
// Vite injects import.meta.env at build time.
//
//   VITE_API_BASE  - full origin (e.g. https://api.example.com). If set, used verbatim.
//   VITE_API_PORT  - port appended to current host in dev (default 8001).
//
// Exports:
//   API_BASE       - the origin only (no trailing slash). Same shape as before.
//   API_BASE_URL   - alias of API_BASE for legacy callers.
//   WS_BASE        - ws:// origin for sockets.
//   API_ENDPOINTS  - named endpoints, useful for the auth service.

const DEFAULT_BACKEND_PORT = import.meta.env.VITE_API_PORT || '8001';

const getApiBase = () => {
	// Explicit override (recommended for production/deploy)
	if (import.meta.env.VITE_API_BASE) return import.meta.env.VITE_API_BASE;

	// Browser runtime (dev + prod): align backend host with current host
	if (typeof window !== 'undefined') {
		const host = window.location.hostname;
		const isLocal = host === 'localhost' || host === '127.0.0.1';
		const resolvedHost = isLocal ? 'localhost' : host;
		return `http://${resolvedHost}:${DEFAULT_BACKEND_PORT}`;
	}

	// Fallback (should rarely happen)
	return `http://localhost:${DEFAULT_BACKEND_PORT}`;
};

const trimTrailingSlash = (u) => (u || '').replace(/\/+$/, '');

export const API_BASE = trimTrailingSlash(getApiBase());
export const API_BASE_URL = API_BASE;
export const WS_BASE = API_BASE.replace(/^http/, 'ws');

export const API_ENDPOINTS = {
	AUTH_REGISTER: `${API_BASE}/auth/register`,
	AUTH_LOGIN: `${API_BASE}/auth/login`,
	AUTH_LOGOUT: `${API_BASE}/auth/logout`,
	AUTH_REFRESH: `${API_BASE}/auth/refresh`,
	AUTH_ME: `${API_BASE}/auth/me`,
	AUTH_FORGOT_PASSWORD: `${API_BASE}/auth/forgot-password`,
	AUTH_RESET_PASSWORD: `${API_BASE}/auth/reset-password`,
};

