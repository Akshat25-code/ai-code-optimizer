import React, { useState } from 'react';
import authService from '../services/authService';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from '../components/AuthLayout';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const navigate = useNavigate();
  const location = useLocation();
  const { login, refresh } = useAuth();

  const from = (location.state && location.state.from) || '/';

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      if (isLogin) {
  result = await login({ email: formData.email, password: formData.password });
      } else {
        result = await authService.register({ name: formData.name, email: formData.email, password: formData.password });
        if (result.success) {
          await login({ email: formData.email, password: formData.password });
        }
      }

      if (result.success) {
        navigate(from, { replace: true });
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocial = async (provider) => {
    setLoading(true);
    setError('');
    const result = await authService.loginWithProvider(provider);
    setLoading(false);
    if (result.success) {
      await refresh();
      navigate(from, { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <AuthLayout>
      <div className="card rounded-2xl p-8 soft-shadow fade-in">
        <h1 className="text-2xl font-semibold mb-1" style={{color:'var(--fg-color)'}}>{isLogin ? 'Welcome back' : 'Create your account'}</h1>
        <p className="text-sm text-muted mb-6">{isLogin ? 'Sign in to continue optimizing your code.' : 'Start optimizing code with a free account.'}</p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{color:'var(--fg-color)'}}>Full Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} required={!isLogin} className="input" placeholder="Enter your full name" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2" style={{color:'var(--fg-color)'}}>Email Address</label>
            <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="input" placeholder="Enter your email" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{color:'var(--fg-color)'}}>Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleInputChange} required minLength={8} className="input" placeholder="Enter your password" />
            {!isLogin && <p className="text-xs text-muted mt-1">At least 8 characters with letters and numbers</p>}
            {isLogin && (
              <div className="mt-2 text-right">
                <button type="button" onClick={()=>navigate('/forgot-password')} className="text-xs text-teal-600 dark:text-teal-400 hover:opacity-90">Forgot password?</button>
              </div>
            )}
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-500 text-white hover:from-teal-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            {loading ? 'Processing...' : (isLogin ? 'Sign in' : 'Create account')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-muted">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-teal-600 dark:text-teal-400 hover:opacity-90 font-medium">
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-center gap-2 text-sm text-muted mb-3">
            <span className="h-px border-t border-theme flex-1" />
            <span>Or continue with</span>
            <span className="h-px border-t border-theme flex-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" disabled={loading} onClick={() => handleSocial('google')} className="btn-secondary">Google</button>
            <button type="button" disabled={loading} onClick={() => handleSocial('github')} className="btn-secondary">GitHub</button>
            <button type="button" disabled={loading} onClick={() => handleSocial('facebook')} className="btn-secondary">Facebook</button>
            <button type="button" disabled={loading} onClick={() => handleSocial('linkedin')} className="btn-secondary">LinkedIn</button>
          </div>
          {isLogin && (
            <div className="mt-4">
              <button type="button" onClick={()=>navigate('/auth/phone')} className="w-full py-2.5 rounded-lg btn-secondary text-sm">Sign in with phone</button>
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  );
};

export default AuthPage;
