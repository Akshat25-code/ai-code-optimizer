import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import authService from '@/services/authService';

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refresh: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load cached user info, then verify with /auth/me (cookie-based)
    const cached = authService.getUserInfo();
    if (cached) {
      setUser(cached);
    }
    // Always verify with server â€” cookie may be valid even without cached info
    authService.getUserProfile().then((res) => {
      if (res.success) setUser(res.data);
      else if (cached) setUser(null); // cookie expired, clear stale cache
    }).finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login: async (credentials) => {
      const res = await authService.login(credentials);
      if (res.success) setUser(res.data.user);
      return res;
    },
    logout: async () => {
      await authService.logout();
      setUser(null);
    },
    refresh: async () => {
      const res = await authService.getUserProfile();
      if (res.success) setUser(res.data);
      return res;
    }
  }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

