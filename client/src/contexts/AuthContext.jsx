import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import authService from '../services/authService';

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
    // Load from storage or /auth/me
    const existing = authService.getUserInfo();
    if (existing) {
      setUser(existing);
      setLoading(false);
    } else if (authService.getAccessToken()) {
      authService.getUserProfile().then((res) => {
        if (res.success) setUser(res.data);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
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
