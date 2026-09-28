import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import authService from '@/services/authService';
import HoneypotField from '@/components/forms/HoneypotField';
import { validatePassword } from '@/lib/validation';
import { isHoneypotFilled, isTooFast, createSubmitThrottle, HONEYPOT_FIELD } from '@/lib/spamGuard';

const ResetPasswordPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [fieldError, setFieldError] = useState('');
  const mountedAt = useRef(Date.now());
  const throttle = useRef(createSubmitThrottle());

  useEffect(()=>{
    const t = params.get('token');
    if (t) setToken(t);
  }, [params]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isHoneypotFilled({ [HONEYPOT_FIELD]: honeypot }) || isTooFast(mountedAt.current) || !throttle.current()) {
      setStatus({ type: 'error', message: 'Something looked automated. Please wait a moment and try again.' });
      return;
    }
    if (password !== confirm) {
      setStatus({ type: 'error', message: 'Passwords do not match' });
      return;
    }
    const problem = validatePassword(password);
    if (problem) {
      setFieldError(problem);
      return;
    }
    setFieldError('');
    setLoading(true);
    setStatus(null);
    const res = await authService.resetPassword(token, password);
    setLoading(false);
    if (res.success) {
      setStatus({ type: 'success', message: res.message + ' Redirecting to login...' });
      setTimeout(()=>navigate('/auth'), 1800);
    } else {
      setStatus({ type: 'error', message: res.error });
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900/70 backdrop-blur border border-gray-800 rounded-xl p-6">
        <h1 className="text-xl font-semibold text-gray-100 mb-2">Reset Password</h1>
        <p className="text-sm text-gray-400 mb-4">Enter your new password below.</p>
        {status && (
          <div className={`mb-4 text-sm px-3 py-2 rounded border ${status.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>{status.message}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <HoneypotField value={honeypot} onChange={(e)=>setHoneypot(e.target.value)} />
          {!token && (
            <div>
              <label htmlFor="reset-token" className="block text-gray-300 text-sm mb-2">Reset Token</label>
              <input id="reset-token" value={token} onChange={(e)=>setToken(e.target.value)} required autoComplete="off" className="w-full px-3 py-2 rounded-lg bg-gray-900/70 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Paste the token you received" />
            </div>
          )}
          <div>
            <label htmlFor="reset-password" className="block text-gray-300 text-sm mb-2">New Password</label>
            <input id="reset-password" type="password" value={password} onChange={(e)=>{setPassword(e.target.value); setFieldError('');}} required autoComplete="new-password" aria-invalid={!!fieldError} className="w-full px-3 py-2 rounded-lg bg-gray-900/70 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
            {fieldError && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldError}</p>}
            {!fieldError && <p className="text-xs text-gray-500 mt-1">At least 8 characters with letters and numbers</p>}
          </div>
          <div>
            <label htmlFor="reset-confirm" className="block text-gray-300 text-sm mb-2">Confirm Password</label>
            <input id="reset-confirm" type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required autoComplete="new-password" className="w-full px-3 py-2 rounded-lg bg-gray-900/70 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <button disabled={loading} className="btn-primary w-full py-2.5 disabled:opacity-50">{loading ? 'Resetting...' : 'Reset Password'}</button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

