import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

const featureLinks = [
  { path: '/optimization', label: 'Optimization', icon: '🚀' },
  { path: '/analysis', label: 'Analysis', icon: '📊' },
  { path: '/bug-detection', label: 'Bug Detection', icon: '🐛' },
  { path: '/documentation', label: 'Documentation', icon: '📚' },
  { path: '/refactoring', label: 'Refactoring', icon: '🏗️' },
  { path: '/debugging', label: 'Debugging', icon: '🔧' },
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
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            {/* Glowing logo icon */}
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-emerald)] grid place-items-center transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(0,245,212,0.3)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#050508]">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
            </div>
            <span className="font-bold text-sm text-gradient-cyber tracking-tight">AI Code Optimizer</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link to="/" className={`nav-link px-3 py-1.5 rounded-lg text-sm transition-all hover:bg-[var(--glow-cyan)] ${location.pathname === '/' ? 'active' : ''}`}>
              Home
            </Link>

            {/* Features Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setShowFeatures(true)}
              onMouseLeave={() => setShowFeatures(false)}
            >
              <button
                onClick={() => setShowFeatures(!showFeatures)}
                className={`nav-link px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 cursor-pointer transition-all hover:bg-[var(--glow-cyan)] ${isFeaturePage ? 'active' : ''}`}
                type="button"
              >
                Features
                <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showFeatures ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <AnimatePresence>
                {showFeatures && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute top-full left-0 mt-2 w-56 rounded-xl overflow-hidden z-50"
                    style={{
                      background: 'var(--card-bg-solid)',
                      border: '1px solid var(--card-border)',
                      backdropFilter: 'blur(20px)',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
                    }}
                  >
                    <div className="p-1.5">
                      {featureLinks.map((f) => (
                        <Link
                          key={f.path}
                          to={f.path}
                          onClick={() => setShowFeatures(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                            location.pathname === f.path
                              ? 'bg-[var(--glow-cyan)] text-[var(--accent-cyan)]'
                              : 'hover:bg-[var(--glow-cyan)]'
                          }`}
                          style={{ color: location.pathname === f.path ? undefined : 'var(--fg-color)' }}
                        >
                          <span className="text-base">{f.icon}</span>
                          <span>{f.label}</span>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link to="/optimize" className={`nav-link px-3 py-1.5 rounded-lg text-sm transition-all hover:bg-[var(--glow-cyan)] ${location.pathname.startsWith('/optimize') ? 'active' : ''}`}>
              All-in-One
            </Link>
            {user && (
              <Link to="/profile" className={`nav-link px-3 py-1.5 rounded-lg text-sm transition-all hover:bg-[var(--glow-cyan)] ${location.pathname.startsWith('/profile') ? 'active' : ''}`}>
                Profile
              </Link>
            )}
          </nav>
        </div>

        {/* Right: Theme + User */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <div className="hidden sm:flex items-center">
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="select text-xs px-2 py-1 bg-transparent"
              title="Theme"
            >
              <option value="system">⚙ System</option>
              <option value="dark">🌙 Dark</option>
              <option value="light">☀ Light</option>
            </select>
          </div>

          {loading ? (
            <div className="w-20 h-8 rounded-lg animate-shimmer" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <Link to="/profile" className="flex items-center gap-2 px-2 py-1 rounded-lg transition-all hover:bg-[var(--glow-cyan)]">
                <div className="relative">
                  <img
                    src={user.profile_picture || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.name || 'user'}`}
                    alt="avatar"
                    className="w-7 h-7 rounded-full ring-1 ring-[var(--card-border)]"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--accent-emerald)] ring-2 ring-[var(--bg-color)]" />
                </div>
                <span className="hidden sm:inline text-sm font-medium" style={{ color: 'var(--fg-color)' }}>
                  {user.name || user.email}
                </span>
              </Link>
              <button
                onClick={logout}
                className="text-xs px-3 py-1.5 rounded-lg btn-secondary"
              >
                Logout
              </button>
            </div>
          ) : (
            !atAuth && (
              <button
                onClick={() => navigate('/auth', { state: { from: window.location.pathname } })}
                className="btn-primary text-sm px-4 py-2"
              >
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
