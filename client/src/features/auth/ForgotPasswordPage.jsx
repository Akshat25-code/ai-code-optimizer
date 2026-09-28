import React, { useRef, useState } from 'react';
import authService from '@/services/authService';
import HoneypotField from '@/components/forms/HoneypotField';
import { validateEmail } from '@/lib/validation';
import { isHoneypotFilled, isTooFast, createSubmitThrottle, HONEYPOT_FIELD } from '@/lib/spamGuard';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const mountedAt = useRef(Date.now());
  const throttle = useRef(createSubmitThrottle());

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isHoneypotFilled({ [HONEYPOT_FIELD]: honeypot }) || isTooFast(mountedAt.current) || !throttle.current()) {
      setStatus({ type: 'error', message: 'Something looked automated. Please wait a moment and try again.' });
      return;
    }
    const problem = validateEmail(email);
    if (problem) {
      setFieldError(problem);
      return;
    }
    setFieldError('');
    setLoading(true);
    setStatus(null);
    const res = await authService.forgotPassword(email.trim());
    setLoading(false);
    if (res.success) {
      setStatus({ type: 'success', message: res.message });
    } else {
      setStatus({ type: 'error', message: res.error });
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900/70 backdrop-blur border border-gray-800 rounded-xl p-6">
        <h1 className="text-xl font-semibold text-gray-100 mb-2">Forgot Password</h1>
        <p className="text-sm text-gray-400 mb-4">Enter your account email and we'll send reset instructions if it exists.</p>
        {status && (
          <div className={`mb-4 text-sm px-3 py-2 rounded border ${status.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>{status.message}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <HoneypotField value={honeypot} onChange={(e)=>setHoneypot(e.target.value)} />
          <div>
            <label htmlFor="forgot-email" className="block text-gray-300 text-sm mb-2">Email</label>
            <input id="forgot-email" type="email" value={email} onChange={(e)=>{setEmail(e.target.value); setFieldError('');}} required autoComplete="email" aria-invalid={!!fieldError} className="w-full px-3 py-2 rounded-lg bg-gray-900/70 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="you@example.com" />
            {fieldError && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{fieldError}</p>}
          </div>
          <button disabled={loading} className="w-full py-2.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-500 text-white disabled:opacity-50">{loading ? 'Sending...' : 'Send Reset Link'}</button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

