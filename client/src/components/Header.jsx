import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const Header = () => {
  const { user, logout, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const atAuth = location.pathname.startsWith('/auth');

  return (
    <header className="sticky top-0 z-50 w-full themed-header">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-bold text-sm sm:text-base bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent hover:opacity-90">
            AI Code Optimizer
          </Link>
          <nav className="hidden sm:flex items-center gap-5 text-sm">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
            <Link to="/optimize" className={`nav-link ${location.pathname.startsWith('/optimize') ? 'active' : ''}`}>Optimize</Link>
            {user && (
              <Link to="/profile" className={`nav-link ${location.pathname.startsWith('/profile') ? 'active' : ''}`}>Profile</Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted">
            <span>Theme</span>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="select"
              title="Theme"
            >
              <option value="system">System</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
          
          {loading ? (
            <span className="text-gray-400 text-sm">Loading...</span>
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link to="/profile" className="flex items-center gap-2">
                <img src={user.profile_picture || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'} alt="avatar" className="w-7 h-7 rounded-full border border-gray-300 dark:border-gray-700" />
                <span className="hidden sm:inline text-sm text-gray-800 dark:text-gray-300">{user.name || user.email}</span>
              </Link>
              <button onClick={logout} className="text-sm px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-800 text-white hover:bg-gray-800 dark:hover:bg-gray-700 border border-gray-700 transition-colors">Logout</button>
            </div>
          ) : (
            !atAuth && (
              <button onClick={() => navigate('/auth', { state: { from: window.location.pathname } })} className="text-sm px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 transition-all">
                Sign in
              </button>
            )
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
