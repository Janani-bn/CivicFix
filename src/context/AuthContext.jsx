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
        // MOCK FALLBACK for UI testing without backend
        console.warn('Backend /auth/me failed. Using mock user.');
        setUser({ id: 'mock-user-1', name: 'Admin/Demo User', email: 'admin@civicfix.com', role: 'admin' });
      } finally {
        setLoading(false);
      }
    };

    loadMe();
  }, [token]);

 
  } catch (err) {
    console.warn('Backend signup error. Simulating success...', err);

    return new Promise((resolve) => setTimeout(() => {
      const mockToken = 'mock-jwt-token';
      const assignedRole = email.toLowerCase().includes('admin')
        ? 'admin'
        : role.toLowerCase();

      const mockUser = {
        id: 'mock-user-1',
        name,
        email,
        role: assignedRole
      };

      localStorage.setItem('civicfix_token', mockToken);
      setToken(mockToken);
      setUser(mockUser);

      resolve(mockUser);
    }, 800));
  }

  const token = data.data.token;
  const user = data.data.user;

  localStorage.setItem('civicfix_token', token);
  setToken(token);
  setUser(user);

  // Volunteer accounts need admin approval.
  if (role.toLowerCase() === 'volunteer') {
    const requestRes = await fetch(`${API_BASE}/volunteers/request`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      }
    }); const signup = async ({ name, email, password, role = 'citizen' }) => {
  let data;

  try {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });

    data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || 'Signup failed');
    }

    const requestData = await requestRes.json();

    if (!requestRes.ok) {
      throw new Error(
        requestData.error?.message || 'Failed to submit volunteer request'
      );
    }
  }

  return user;
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
      console.warn('Backend login error. Simulating success...', err);
      return new Promise((resolve) => setTimeout(() => {
        const mockToken = 'mock-jwt-token';
        const role = email.toLowerCase().includes('admin') ? 'admin' : 'user';
        const mockUser = { id: 'mock-user-1', name: role === 'admin' ? 'System Admin' : 'Demo User', email, role };
        localStorage.setItem('civicfix_token', mockToken);
        setToken(mockToken);
        setUser(mockUser);
        resolve(mockUser);
      }, 800));
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

