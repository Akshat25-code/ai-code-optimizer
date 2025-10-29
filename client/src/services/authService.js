// Authentication Service
// Handles user authentication with MongoDB backend

import { API_ENDPOINTS, API_BASE_URL } from '../config/api';

class AuthService {
  constructor() {
    this.tokenKey = 'auth_token';
    this.refreshTokenKey = 'refresh_token';
    this.userKey = 'user_info';
  }

  // Open OAuth popup and wait for tokens via postMessage
  openOAuthPopup(url) {
    return new Promise((resolve, reject) => {
      const popup = window.open(url, 'oauth_popup', 'width=500,height=650');
      if (!popup) {
        reject(new Error('Popup blocked'));
        return;
      }

      const timeout = setTimeout(() => {
        window.removeEventListener('message', onMessage);
        try { popup.close(); } catch {}
        reject(new Error('Login timed out'));
      }, 60000);

      const closePoll = setInterval(() => {
        if (popup.closed) {
          clearInterval(closePoll);
          clearTimeout(timeout);
          window.removeEventListener('message', onMessage);
          reject(new Error('Popup closed'));
        }
      }, 500);

      const onMessage = (event) => {
        try {
          // Only accept messages from our backend origin (dev-friendly: allow 127.0.0.1 <-> localhost swap)
          const apiUrl = new URL(API_BASE_URL);
          const expectedOrigin = `${apiUrl.protocol}//${apiUrl.host}`;
          const accepted = new Set([expectedOrigin]);
          // Accept localhost/127.0.0.1 interchangeably for dev
          const [hostName, port] = apiUrl.host.split(":");
          if (hostName === 'localhost') {
            accepted.add(`${apiUrl.protocol}//127.0.0.1:${port || '80'}`);
          }
          if (hostName === '127.0.0.1') {
            accepted.add(`${apiUrl.protocol}//localhost:${port || '80'}`);
          }
          if (!accepted.has(event.origin)) {
            return; // ignore messages from other origins
          }
        } catch {}
        const data = event.data;
        if (!data || data.source !== 'oauth') return;
        // Optionally validate event.origin here
        window.removeEventListener('message', onMessage);
        clearTimeout(timeout);
        clearInterval(closePoll);
        try { popup.close(); } catch {}
        resolve(data.payload);
      };

      window.addEventListener('message', onMessage);
    });
  }

  // Social login using popup mode
  async loginWithProvider(provider) {
    try {
      const returnTo = window.location.origin;
      const startUrl = `${API_BASE_URL}/auth/oauth/${provider}/start?mode=popup&redirect_uri=${encodeURIComponent(returnTo)}`;
      const result = await this.openOAuthPopup(startUrl);
      this.setTokens(result.access_token, result.refresh_token, result.user);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message || 'Social login failed' };
    }
  }

  // Get tokens from localStorage
  getAccessToken() {
    return localStorage.getItem(this.tokenKey);
  }

  getRefreshToken() {
    return localStorage.getItem(this.refreshTokenKey);
  }

  // Get user info from localStorage
  getUserInfo() {
    const userInfo = localStorage.getItem(this.userKey);
    return userInfo ? JSON.parse(userInfo) : null;
  }

  // Store tokens and user info
  setTokens(accessToken, refreshToken, userInfo) {
    localStorage.setItem(this.tokenKey, accessToken);
    localStorage.setItem(this.refreshTokenKey, refreshToken);
    if (userInfo) {
      localStorage.setItem(this.userKey, JSON.stringify(userInfo));
    }
  }

  // Clear all auth data
  clearTokens() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = this.getAccessToken();
    if (!token) return false;
    
    // Check if token is expired (basic check)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }

  // Register new user
  async register(userData) {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH_REGISTER, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        this.setTokens(data.access_token, data.refresh_token, data.user);
        return { success: true, data };
      } else {
        return { success: false, error: data.detail || 'Registration failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error during registration' };
    }
  }

  // Login user
  async login(credentials) {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH_LOGIN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        this.setTokens(data.access_token, data.refresh_token, data.user);
        return { success: true, data };
      } else {
        return { success: false, error: data.detail || 'Login failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error during login' };
    }
  }

  // Logout user
  async logout() {
    const refreshToken = this.getRefreshToken();
    
    try {
      if (refreshToken) {
        await fetch(API_ENDPOINTS.AUTH_LOGOUT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAccessToken()}`,
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      }
    } catch (error) {
      console.warn('Logout request failed:', error);
    }

    this.clearTokens();
    return { success: true };
  }

  // Refresh access token
  async refreshToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return { success: false, error: 'No refresh token' };

    try {
      const response = await fetch(API_ENDPOINTS.AUTH_REFRESH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem(this.tokenKey, data.access_token);
        return { success: true, data };
      } else {
        this.clearTokens();
        return { success: false, error: 'Token refresh failed' };
      }
    } catch (error) {
      this.clearTokens();
      return { success: false, error: 'Network error during token refresh' };
    }
  }

  // Get user profile
  async getUserProfile() {
    const token = this.getAccessToken();
    if (!token) return { success: false, error: 'No access token' };

    try {
      const response = await fetch(API_ENDPOINTS.AUTH_ME, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem(this.userKey, JSON.stringify(data));
        return { success: true, data };
      } else if (response.status === 401) {
        // Try to refresh token
        const refreshResult = await this.refreshToken();
        if (refreshResult.success) {
          return this.getUserProfile(); // Retry with new token
        } else {
          return { success: false, error: 'Authentication expired' };
        }
      } else {
        return { success: false, error: data.detail || 'Failed to get user profile' };
      }
    } catch (error) {
      return { success: false, error: 'Network error during profile fetch' };
    }
  }

  // Forgot password
  async forgotPassword(email) {
    try {
      const form = new URLSearchParams();
      form.append('email', email);
      const response = await fetch(API_ENDPOINTS.AUTH_FORGOT_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        return { success: true, message: data.message || 'If the email exists, reset instructions were sent.' };
      }
      return { success: false, error: data.detail || 'Failed to request password reset' };
    } catch (error) {
      return { success: false, error: 'Network error during password reset request' };
    }
  }

  // Reset password
  async resetPassword(token, newPassword) {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH_RESET_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        return { success: true, message: data.message || 'Password reset successful' };
      }
      return { success: false, error: data.detail || 'Failed to reset password' };
    } catch (e) {
      return { success: false, error: 'Network error during password reset' };
    }
  }

  // Helper: smart login with email or phone
  async smartLogin(identifier, password) {
    const payload = identifier.includes('@') ? { email: identifier, password } : { phone: identifier, password };
    return this.login(payload);
  }

  // Make authenticated API request
  async authenticatedRequest(url, options = {}) {
    let token = this.getAccessToken();
    
    if (!token) {
      throw new Error('No access token available');
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // If token expired, try to refresh
    if (response.status === 401) {
      const refreshResult = await this.refreshToken();
      if (refreshResult.success) {
        headers.Authorization = `Bearer ${this.getAccessToken()}`;
        response = await fetch(url, {
          ...options,
          headers,
        });
      } else {
        throw new Error('Authentication expired');
      }
    }

    return response;
  }
}

// Create singleton instance
const authService = new AuthService();
export default authService;