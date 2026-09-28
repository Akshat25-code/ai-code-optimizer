import React, { useRef, useState } from 'react';
import authService from '@/services/authService';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AuthLayout from '@/components/layout/AuthLayout';
import HoneypotField from '@/components/forms/HoneypotField';
import { validateEmail, validatePassword, validateName, validateForm } from '@/lib/validation';
import { isHoneypotFilled, isTooFast, createSubmitThrottle, HONEYPOT_FIELD } from '@/lib/spamGuard';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({ name: '', email: '', password: '', [HONEYPOT_FIELD]: '' });
  const navigate = useNavigate();
  const location = useLocation();
  const { login, refresh } = useAuth();
  const mountedAt = useRef(Date.now());
  const throttle = useRef(createSubmitThrottle());

  const from = (location.state && location.state.from) || '/';

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    if (fieldErrors[e.target.name]) {
      setFieldErrors({ ...fieldErrors, [e.target.name]: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Spam gates (server rate limits remain authoritative).
    if (isHoneypotFilled(formData) || isTooFast(mountedAt.current) || !throttle.current()) {
      setError('Something looked automated. Please wait a moment and try again.');
      return;
    }
    const schema = { email: validateEmail, password: (v) => (isLogin ? (v ? '' : 'Password is required.') : validatePassword(v)) };
    if (!isLogin) schema.name = validateName;
    const problems = validateForm(formData, schema);
    if (Object.keys(problems).length > 0) {
      setFieldErrors(problems);
      return;
    }
    setLoading(true);
    setError('');

    try {
      let result;
      if (isLogin) {
  result = await login({ email: formData.email.trim(), password: formData.password });
      } else {
        result = await authService.register({ name: formData.name.trim(), email: formData.email.trim(), password: formData.password });
        if (result.success) {
          await login({ email: formData.email.trim(), password: formData.password });
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
          <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <HoneypotField value={formData[HONEYPOT_FIELD]} onChange={handleInputChange} />
          {!isLogin && (
            <div>
              <label htmlFor="auth-name" className="block text-sm font-medium mb-2" style={{color:'var(--fg-color)'}}>Full Name</label>
              <input id="auth-name" type="text" name="name" value={formData.name} onChange={handleInputChange} required={!isLogin} autoComplete="name" aria-invalid={!!fieldErrors.name} className="input" placeholder="Enter your full name" />
              {fieldErrors.name && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.name}</p>}
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-sm font-medium mb-2" style={{color:'var(--fg-color)'}}>Email Address</label>
            <input id="auth-email" type="email" name="email" value={formData.email} onChange={handleInputChange} required autoComplete="email" aria-invalid={!!fieldErrors.email} className="input" placeholder="Enter your email" />
            {fieldErrors.email && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.email}</p>}
          </div>
          <div>
            <label htmlFor="auth-password" className="block text-sm font-medium mb-2" style={{color:'var(--fg-color)'}}>Password</label>
            <input id="auth-password" type="password" name="password" value={formData.password} onChange={handleInputChange} required minLength={8} autoComplete={isLogin ? 'current-password' : 'new-password'} aria-invalid={!!fieldErrors.password} className="input" placeholder="Enter your password" />
            {fieldErrors.password && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldErrors.password}</p>}
            {!isLogin && !fieldErrors.password && <p className="text-xs text-muted mt-1">At least 8 characters with letters and numbers</p>}
            {isLogin && (
              <div className="mt-2 text-right">
                <button type="button" onClick={()=>navigate('/forgot-password')} className="text-xs text-teal-700 dark:text-teal-300 hover:opacity-90">Forgot password?</button>
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
            <button onClick={() => { setIsLogin(!isLogin); setError(''); setFieldErrors({}); }} className="text-teal-700 dark:text-teal-300 hover:opacity-90 font-medium">
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
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default AuthPage;

