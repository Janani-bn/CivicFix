import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState('citizen');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login({ ...formData, role });
      localStorage.setItem('userRole', role);
      if (role === 'volunteer') navigate('/volunteer');
      else if (role === 'admin') navigate('/admin');
      else navigate('/feed');
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Login</h2>

        {error && <div className="auth-error">{error}</div>}

        {/* ROLE SELECTOR */}
        <div className="role-selector">
          <p className="role-label">Sign in as</p>
          <div className="role-options">
            <button
              type="button"
              className={`role-btn ${role === 'citizen' ? 'active' : ''}`}
              aria-pressed={role === 'citizen'}
              onClick={() => setRole('citizen')}
            >
              <span className="role-icon">👤</span>
              <span className="role-name">Citizen</span>
              <span className="role-desc">Report issues</span>
            </button>
            <button
              type="button"
              className={`role-btn ${role === 'volunteer' ? 'active' : ''}`}
              aria-pressed={role === 'volunteer'}
              onClick={() => setRole('volunteer')}
            >
              <span className="role-icon">🤝</span>
              <span className="role-name">Volunteer</span>
              <span className="role-desc">Help resolve</span>
            </button>
            <button
              type="button"
              className={`role-btn ${role === 'admin' ? 'active' : ''}`}
              aria-pressed={role === 'admin'}
              onClick={() => setRole('admin')}
            >
              <span className="role-icon">🏛️</span>
              <span className="role-name">Authority</span>
              <span className="role-desc">Manage reports</span>
            </button>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>
          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="auth-actions">
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          Don&apos;t have an account?
          <Link to="/signup">Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;