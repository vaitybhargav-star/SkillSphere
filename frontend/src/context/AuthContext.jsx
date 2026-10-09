import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const parseStorage = (key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('AuthProvider: failed to parse localStorage.' + key, err);
      localStorage.removeItem(key);
      return null;
    }
  };

  const [token, setTokenState] = useState(() => localStorage.getItem('token') || null);
  const [user, setUserState] = useState(() => parseStorage('user'));

  useEffect(() => {
    // keep localStorage in sync if token changes
    try {
      if (token) localStorage.setItem('token', token);
      else localStorage.removeItem('token');
    } catch (err) {
      console.warn('AuthProvider: failed to write token to localStorage', err);
    }
  }, [token]);

  useEffect(() => {
    try {
      if (user) localStorage.setItem('user', JSON.stringify(user));
      else localStorage.removeItem('user');
    } catch (err) {
      console.warn('AuthProvider: failed to write user to localStorage', err);
    }
  }, [user]);

  // expose safe setters that update both state and localStorage
  const setAuthToken = (next) => {
    setTokenState(next);
  };

  const setAuthUser = (next) => {
    setUserState(next);
  };

  const logout = () => {
    setTokenState(null);
    setUserState(null);
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (err) {
      // ignore
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, setAuthToken, setAuthUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;