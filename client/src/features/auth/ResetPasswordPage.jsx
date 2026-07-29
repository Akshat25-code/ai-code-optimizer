import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import authService from '@/services/authService';

const ResetPasswordPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{
    const t = params.get('token');
    if (t) setToken(t);
  }, [params]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setStatus({ type: 'error', message: 'Passwords do not match' });
      return;
    }
    if (password.length < 8) {
      setStatus({ type: 'error', message: 'Password must be at least 8 characters' });
      return;
    }
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {!token && (
            <div>
              <label className="block text-gray-300 text-sm mb-2">Reset Token</label>
              <input value={token} onChange={(e)=>setToken(e.target.value)} required className="w-full px-3 py-2 rounded-lg bg-gray-900/70 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Paste the token you received" />
            </div>
          )}
          <div>
            <label className="block text-gray-300 text-sm mb-2">New Password</label>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required className="w-full px-3 py-2 rounded-lg bg-gray-900/70 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-gray-300 text-sm mb-2">Confirm Password</label>
            <input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required className="w-full px-3 py-2 rounded-lg bg-gray-900/70 border border-gray-700 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <button disabled={loading} className="w-full py-2.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-500 text-white disabled:opacity-50">{loading ? 'Resetting...' : 'Reset Password'}</button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

