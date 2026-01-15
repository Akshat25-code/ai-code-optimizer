// API Configuration
// Single source of truth: src/config.js

import { API_BASE as API_BASE_URL } from '../config';

export { API_BASE_URL };

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
