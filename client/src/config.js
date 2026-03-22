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

export const API_BASE = getApiBase();
export const WS_BASE = API_BASE.replace(/^http/, 'ws');
