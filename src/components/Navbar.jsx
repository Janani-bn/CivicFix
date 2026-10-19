import { MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNavLinks } from '../utils/navLinks';
import './Navbar.css';

const Navbar = ({ onOpenReport }) => {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const isLoggedIn = Boolean(token);
  const links = getNavLinks({ isLoggedIn, role: user?.role });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="container nav-container">
        <Link to="/" className="logo">
          <MapPin className="logo-icon" size={28} />
          <span className="logo-text">CivicFix</span>
        </Link>
        <div className="nav-links">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link${link.className ? ` ${link.className}` : ''}`}
              data-guide-id={link.guideId}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="nav-actions">
          <button className="btn btn-primary nav-btn" onClick={onOpenReport} data-guide-id="report-button">
            Report Issue
          </button>
          {isLoggedIn ? (
            <button className="btn btn-secondary nav-btn nav-logout-btn" onClick={handleLogout}>
              Log out
            </button>
          ) : (
            <Link to="/login" className="btn btn-secondary nav-btn">
              Log in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
