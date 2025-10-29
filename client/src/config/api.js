// API Configuration
// This file handles API endpoints for both local and network access

const getApiBaseUrl = () => {
  // Check if we're running in development or production
  if (import.meta.env.DEV) {
    // Development mode - check if we're accessing via network IP
    const currentHost = window.location.hostname;
    
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      // Local access - align with backend currently running on 8001
      return 'http://localhost:8001';
    } else {
      // Network access - use the same IP as frontend
      return `http://${currentHost}:8001`;
    }
  } else {
    // Production mode
    return `http://${window.location.hostname}:8001`;
  }
};

export const API_BASE_URL = getApiBaseUrl();

// API endpoints
export const API_ENDPOINTS = {
  // Code analysis endpoints
  ANALYZE_CODE: `${API_BASE_URL}/analyze-code`,
  EVALUATE_OPTIMIZATION: `${API_BASE_URL}/evaluate-optimization`,
  TEST_OPTIMIZATION_SAMPLE: `${API_BASE_URL}/test-optimization-sample`,
  
  // Authentication endpoints (MongoDB)
  AUTH_REGISTER: `${API_BASE_URL}/auth/register`,
  AUTH_LOGIN: `${API_BASE_URL}/auth/login`,
  AUTH_LOGOUT: `${API_BASE_URL}/auth/logout`,
  AUTH_ME: `${API_BASE_URL}/auth/me`,
  AUTH_REFRESH: `${API_BASE_URL}/auth/refresh`,
  AUTH_HEALTH: `${API_BASE_URL}/auth/health`,
  AUTH_FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
  AUTH_RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
  
  // General endpoints
  ROOT: `${API_BASE_URL}/`,
  DOCS: `${API_BASE_URL}/docs`,
};

// Network information for debugging
export const getNetworkInfo = () => {
  return {
    hostname: window.location.hostname,
    port: window.location.port,
    protocol: window.location.protocol,
    apiBaseUrl: API_BASE_URL,
    isLocalAccess: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    isNetworkAccess: !['localhost', '127.0.0.1'].includes(window.location.hostname)
  };
};

console.log('🌐 API Configuration:', {
  baseUrl: API_BASE_URL,
  networkInfo: getNetworkInfo()
});

console.log('🔍 All API Endpoints:', API_ENDPOINTS);
