
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
  const [token, setToken] = useState(
    () => localStorage.getItem('civicfix_token')
  );
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
        console.error('Failed to load authenticated user:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    loadMe();
  }, [token]);

  const signup = async ({
    name,
    email,
    password,
    role = 'citizen'
  }) => {
    // Step 1: Create the account through the real backend.
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        email,
        password
      })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        data.error?.message ||
        'Signup failed. Please try again.'
      );
    }

    if (!data.data?.token || !data.data?.user) {
      throw new Error(
        'The server returned an invalid signup response.'
      );
    }

    const { token: newToken, user: newUser } = data.data;

    // Step 2: Save the authenticated account.
    localStorage.setItem('civicfix_token', newToken);
    setToken(newToken);
    setUser(newUser);

    let volunteerRequestStatus = 'not_requested';
    let volunteerRequestError = '';

    // Step 3: Submit a volunteer enrollment request.
    // The backend still assigns the initial role as citizen.
    if (role === 'volunteer') {
      try {
        const requestRes = await fetch(
          `${API_BASE}/volunteers/request`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${newToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const requestData = await requestRes
          .json()
          .catch(() => ({}));

        if (!requestRes.ok) {
          volunteerRequestStatus = 'failed';
          volunteerRequestError =
            requestData.error?.message ||
            'The server could not submit your request.';
        } else {
          volunteerRequestStatus = 'pending';
        }
      } catch (err) {
        console.error(
          'Failed to submit volunteer request:',
          err
        );

        volunteerRequestStatus = 'failed';
        volunteerRequestError =
          'Could not connect to the volunteer enrollment service.';
      }
    }

    return {
      user: newUser,
      volunteerRequestStatus,
      volunteerRequestError
    };
  };

  const login = async ({ email, password }) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error?.message || 'Login failed'
        );
      }

      localStorage.setItem(
        'civicfix_token',
        data.data.token
      );

      setToken(data.data.token);
      setUser(data.data.user);

      return data.data.user;
    } catch (err) {
      // Never simulate a successful login when the backend fails.
      throw err;
    }
  };

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
    throw new Error(
      'useAuth must be used inside AuthProvider'
    );
  }

  return ctx;
};
