import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

const featureLinks = [
  { path: '/optimization', label: '🚀 Optimization', icon: '🚀' },
  { path: '/analysis', label: '📊 Analysis', icon: '📊' },
  { path: '/bug-detection', label: '🐛 Bug Detection', icon: '🐛' },
  { path: '/documentation', label: '📚 Documentation', icon: '📚' },
  { path: '/refactoring', label: '🏗️ Refactoring', icon: '🏗️' },
  { path: '/debugging', label: '🔧 Debugging', icon: '🔧' },
];

const Header = () => {
  const { user, logout, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const atAuth = location.pathname.startsWith('/auth');
  const [showFeatures, setShowFeatures] = useState(false);

  const isFeaturePage = featureLinks.some(f => location.pathname === f.path);

  return (
    <header className="sticky top-0 z-50 w-full themed-header">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-bold text-sm sm:text-base bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent hover:opacity-90">
            AI Code Optimizer
          </Link>
          <nav className="hidden sm:flex items-center gap-5 text-sm">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
            
            {/* Features Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setShowFeatures(true)}
              onMouseLeave={() => setShowFeatures(false)}
            >
              <button 
                onClick={() => setShowFeatures(!showFeatures)}
                className={`nav-link flex items-center gap-1 cursor-pointer ${isFeaturePage ? 'active' : ''}`}
                type="button"
              >
                Features
                <svg className={`w-4 h-4 transition-transform duration-200 ${showFeatures ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showFeatures && (
                <div 
                  className="absolute top-full left-0 mt-1 w-52 rounded-xl shadow-2xl overflow-hidden z-50"
                  style={{ 
                    background: 'var(--card-bg)', 
                    border: '1px solid var(--card-border)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                  }}
                >
                  {featureLinks.map((f) => (
                    <Link
                      key={f.path}
                      to={f.path}
                      onClick={() => setShowFeatures(false)}
                      className={`block px-4 py-3 text-sm hover:bg-teal-500/20 transition-colors border-b last:border-b-0 ${location.pathname === f.path ? 'text-teal-400 bg-teal-500/10' : ''}`}
                      style={{ 
                        color: location.pathname === f.path ? undefined : 'var(--fg-color)',
                        borderColor: 'var(--card-border)'
                      }}
                    >
                      {f.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Link to="/optimize" className={`nav-link ${location.pathname.startsWith('/optimize') ? 'active' : ''}`}>All-in-One</Link>
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
              <button onClick={() => navigate('/auth', { state: { from: window.location.pathname } })} className="text-sm px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-500 text-white hover:from-teal-500 hover:to-emerald-400 transition-all">
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
