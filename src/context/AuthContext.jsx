/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('civicfix_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (!res.ok) {
          localStorage.removeItem('civicfix_token');
          setToken(null);
          setUser(null);
          return;
        }

        setUser(data.data.user);
      } catch {
        localStorage.removeItem('civicfix_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadMe();
  }, [token]);

  const signup = async ({ name, email, password, role = 'Citizen' }) => {
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Signup failed');

      localStorage.setItem('civicfix_token', data.data.token);
      setToken(data.data.token);
      setUser(data.data.user);
      return data.data.user;
    } catch (err) {
      throw new Error(err.message || 'Signup failed');
    }
  };

  const login = async ({ email, password }) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Login failed');

      localStorage.setItem('civicfix_token', data.data.token);
      setToken(data.data.token);
      setUser(data.data.user);
      return data.data.user;
    } catch (err) {
      throw new Error(err.message || 'Login failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('civicfix_token');
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ token, user, loading, signup, login, logout }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

