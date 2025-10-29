import { API_BASE_URL } from '../config/api';
import authService from './authService';

const base = `${API_BASE_URL}/profile`;

const profileService = {
  async getMe() {
    const res = await authService.authenticatedRequest(`${base}/me`);
    const data = await res.json();
    return { ok: res.ok, data };
  },

  async updateMe(payload) {
    const res = await authService.authenticatedRequest(`${base}/me`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  },

  async updatePreferences(prefs) {
    const res = await authService.authenticatedRequest(`${base}/preferences`, {
      method: 'PATCH',
      body: JSON.stringify(prefs),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  },

  async changePassword(current_password, new_password) {
    const res = await authService.authenticatedRequest(`${base}/change-password`, {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  },

  async listConnected() {
    const res = await authService.authenticatedRequest(`${base}/connected-accounts`);
    const data = await res.json();
    return { ok: res.ok, data };
  },

  async unlinkProvider(provider) {
    const res = await authService.authenticatedRequest(`${base}/connected-accounts/${provider}`, {
      method: 'DELETE',
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  },

  async uploadAvatar(file) {
    const token = authService.getAccessToken();
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${base}/upload-avatar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form,
    });
    const data = await res.json();
    return { ok: res.ok, data };
  },

  async exportProfile() {
    const token = authService.getAccessToken();
    const res = await fetch(`${base}/export`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return res; // caller handles download
  },

  async deleteAccount() {
    const res = await authService.authenticatedRequest(`${base}/me`, { method: 'DELETE' });
    return { ok: res.ok };
  },

  // Enhanced Profile API Methods

  async updateProfileSection(section, payload) {
    const endpoints = {
      'profile': `${base}/me`,
      'location': `${base}/location`, 
      'professional': `${base}/professional`,
      'social-links': `${base}/social-links`
    };

    const res = await authService.authenticatedRequest(endpoints[section], {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  },

  async getAnalytics() {
    const res = await authService.authenticatedRequest(`${base}/analytics`);
    const data = await res.json();
    return { ok: res.ok, data };
  },

  async getLoginHistory(limit = 20) {
    const res = await authService.authenticatedRequest(`${base}/login-history?limit=${limit}`);
    const data = await res.json();
    return { ok: res.ok, data };
  },

  async getActiveSessions() {
    const res = await authService.authenticatedRequest(`${base}/active-sessions`);
    const data = await res.json();
    return { ok: res.ok, data };
  },

  async terminateSession(sessionId) {
    const res = await authService.authenticatedRequest(`${base}/active-sessions/${sessionId}`, {
      method: 'DELETE',
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  },

  async exportProfilePDF() {
    const token = authService.getAccessToken();
    let url = `${base}/export-pdf-demo`; // Default to demo endpoint
    let headers = {};
    
    if (token) {
      url = `${base}/export-pdf`;
      headers = { 'Authorization': `Bearer ${token}` };
    }
    
    const res = await fetch(url, {
      method: 'GET',
      headers: headers,
    });
    
    // Don't try to parse as JSON - return raw response for blob handling
    return res;
  }
};

export default profileService;
