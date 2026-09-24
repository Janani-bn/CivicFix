import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

const SignUp = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'citizen'
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signup(formData);
      localStorage.setItem('userRole', formData.role);
      if (formData.role === 'volunteer') navigate('/volunteer');
      else if (formData.role === 'admin') navigate('/admin');
      else navigate('/feed');
    } catch (err) {
      setError(err.message || 'An error occurred during signup.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Create an Account</h2>
        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              autoComplete="name"
            />
          </div>

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
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          {/* ROLE SELECTOR */}
          <div className="role-selector">
            <p className="role-label">Sign up as</p>
            <div className="role-options" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <button
                type="button"
                className={`role-btn ${formData.role === 'citizen' ? 'active' : ''}`}
                aria-pressed={formData.role === 'citizen'}
                onClick={() => setFormData(prev => ({ ...prev, role: 'citizen' }))}
              >
                <span className="role-icon">👤</span>
                <span className="role-name">Citizen</span>
                <span className="role-desc">Report issues</span>
              </button>
              <button
                type="button"
                className={`role-btn ${formData.role === 'volunteer' ? 'active' : ''}`}
                aria-pressed={formData.role === 'volunteer'}
                onClick={() => setFormData(prev => ({ ...prev, role: 'volunteer' }))}
              >
                <span className="role-icon">🤝</span>
                <span className="role-name">Volunteer</span>
                <span className="role-desc">Help resolve</span>
              </button>
              <button
                type="button"
                className={`role-btn ${formData.role === 'admin' ? 'active' : ''}`}
                aria-pressed={formData.role === 'admin'}
                onClick={() => setFormData(prev => ({ ...prev, role: 'admin' }))}
              >
                <span className="role-icon">🏛️</span>
                <span className="role-name">Authority</span>
                <span className="role-desc">Manage reports</span>
              </button>
            </div>
          </div>

          <div className="auth-actions">
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? 'Signing up...' : 'Sign Up'}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          Already have an account?
          <Link to="/login">Login</Link>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
