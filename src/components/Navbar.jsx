import { MapPin } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = ({ onOpenReport }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/map" className="nav-link">Live Map</Link>
          <Link to="/track" className="nav-link" data-guide-id="track-link">Track Status</Link>
          {user && (
            <>
              <Link to="/my-complaints" className="nav-link">My Complaints</Link>
              <Link to="/nearby-issues" className="nav-link">Nearby Issues</Link>
            </>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin" className="nav-link admin-link-pill">Admin Portal</Link>
          )}
        </div>
        <div className="nav-actions">
          <button className="btn btn-primary nav-btn" onClick={onOpenReport} data-guide-id="report-button">
            Report Issue
          </button>
          {user ? (
            <button className="btn btn-secondary nav-btn" onClick={handleLogout}>
              Log Out
            </button>
          ) : (
            <Link to="/login" className="btn btn-secondary nav-btn">Log In</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
