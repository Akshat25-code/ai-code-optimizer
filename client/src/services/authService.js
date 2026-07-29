// Authentication Service
// Handles user authentication with MongoDB backend
// Auth tokens are httpOnly cookies â€” managed by browser, not JS.

import { API_ENDPOINTS, API_BASE_URL } from '@/config';

class AuthService {
  constructor() {
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
        try { popup.close(); } catch (_e) { /* popup may already be closed */ }
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
          const [hostName, port] = apiUrl.host.split(":");
          if (hostName === 'localhost') {
            accepted.add(`${apiUrl.protocol}//127.0.0.1:${port || '80'}`);
          }
          if (hostName === '127.0.0.1') {
            accepted.add(`${apiUrl.protocol}//localhost:${port || '80'}`);
          }
          if (!accepted.has(event.origin)) {
            return;
          }
        } catch (_e) { /* origin URL parse failed â€” skip message */ }
        const data = event.data;
        if (!data || data.source !== 'oauth') return;
        window.removeEventListener('message', onMessage);
        clearTimeout(timeout);
        clearInterval(closePoll);
        try { popup.close(); } catch (_e) { /* popup may already be closed */ }
        resolve(data.payload);
      };

      window.addEventListener('message', onMessage);
    });
  }

  // Social login using popup mode
  async loginWithProvider(provider) {
    try {
      const supportedProviders = new Set(['google', 'github']);
      if (!supportedProviders.has(provider)) {
        return { success: false, error: `${provider} login is disabled` };
      }
      const returnTo = window.location.origin;
      const startUrl = `${API_BASE_URL}/auth/oauth/${provider}/start?mode=popup&redirect_uri=${encodeURIComponent(returnTo)}`;
      const result = await this.openOAuthPopup(startUrl);
      this.saveUserInfo(result.user);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message || 'Social login failed' };
    }
  }

  // Get user info from localStorage (NOT tokens â€” just display data)
  getUserInfo() {
    const userInfo = localStorage.getItem(this.userKey);
    return userInfo ? JSON.parse(userInfo) : null;
  }

  // Store user info for display
  saveUserInfo(userInfo) {
    if (userInfo) {
      localStorage.setItem(this.userKey, JSON.stringify(userInfo));
    }
  }

  // Clear user info
  clearUserInfo() {
    localStorage.removeItem(this.userKey);
  }

  // Check if user is authenticated (local check â€” verify with getUserProfile for certainty)
  isAuthenticated() {
    return !!this.getUserInfo();
  }

  // Register new user
  async register(userData) {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH_REGISTER, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (response.ok) {
        this.saveUserInfo(data.user);
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
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        this.saveUserInfo(data.user);
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
    try {
      await fetch(API_ENDPOINTS.AUTH_LOGOUT, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.warn('Logout request failed:', error);
    }

    this.clearUserInfo();
    return { success: true };
  }

  // Get user profile (uses httpOnly cookie automatically)
  async getUserProfile() {
    try {
      const response = await fetch(API_ENDPOINTS.AUTH_ME, {
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.clearUserInfo();
          return { success: false, error: 'Authentication expired' };
        }
        const data = await response.json().catch(() => ({}));
        return { success: false, error: data.detail || 'Failed to get user profile' };
      }

      const data = await response.json();
      localStorage.setItem(this.userKey, JSON.stringify(data));
      return { success: true, data };
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
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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

  // Helper: simple email login
  async smartLogin(identifier, password) {
    return this.login({ email: identifier, password });
  }

  // Make authenticated API request (uses httpOnly cookies)
  async authenticatedRequest(url, options = {}) {
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
    };

    let response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (response.status === 401) {
      this.clearUserInfo();
      throw new Error('Authentication expired');
    }

    return response;
  }
}

// Create singleton instance
const authService = new AuthService();
export default authService;

