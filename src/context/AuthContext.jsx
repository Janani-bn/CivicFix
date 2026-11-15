/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

import { API_BASE } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() =>
    localStorage.getItem('civicfix_token')
  );

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get current logged-in user
  useEffect(() => {
    const loadMe = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data = await res.json();

        if (!res.ok) {
          localStorage.removeItem('civicfix_token');
          setToken(null);
          setUser(null);
          return;
        }

        setUser(data.data.user);
      } catch (err) {
        console.error('Failed to load current user:', err);

        // Do NOT create a fake user.
        localStorage.removeItem('civicfix_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadMe();
  }, [token]);

  // Signup
  const signup = async ({ name, email, password, role = 'citizen' }) => {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        email,
        password,
        role
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data?.error?.message ||
        data?.message ||
        'Signup failed'
      );
    }

    const newToken = data.data.token;
    const newUser = data.data.user;

    localStorage.setItem('civicfix_token', newToken);

    setToken(newToken);
    setUser(newUser);

    return newUser;
  };

  // Login
  const login = async ({ email, password }) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data?.error?.message ||
        data?.message ||
        'Login failed'
      );
    }

    const newToken = data.data.token;
    const loggedInUser = data.data.user;

    localStorage.setItem('civicfix_token', newToken);

    setToken(newToken);
    setUser(loggedInUser);

    return loggedInUser;
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('civicfix_token');

    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      signup,
      login,
      logout
    }),
    [token, user, loading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return ctx;
};
