import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';
import AuthLayout from '../components/AuthLayout';

const PhoneLoginPage = () => {
  const [countryCode, setCountryCode] = useState('+1');
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [toasts, setToasts] = useState([]); // {id, type: 'success'|'error'|'info', message}
  const [openDD, setOpenDD] = useState(false);
  const [search, setSearch] = useState('');
  const [step, setStep] = useState(1); // 1: phone+name, 2: otp, 3: password
  const [resendIn, setResendIn] = useState(0);
  const otpRef = useRef(null);
  const ddRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const from = (location.state && location.state.from) || '/';

  const fullPhone = `${countryCode}${number.replace(/[^0-9]/g,'')}`;

  useEffect(() => {
    function onClickOutside(e){
      if (ddRef.current && !ddRef.current.contains(e.target)) setOpenDD(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // resend countdown
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  // focus OTP when entering step 2
  useEffect(() => {
    if (step === 2 && otpRef.current) {
      otpRef.current.focus();
    }
  }, [step]);

  const maskPhone = (p) => p.replace(/^(\+\d{2,3})(\d+)(\d{2})$/, (_, cc, mid, last) => `${cc}${'*'.repeat(Math.max(0, mid.length))}${last}`);

  const addToast = (type, message) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  };

  const filteredCountries = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return COUNTRY_CODES;
    return COUNTRY_CODES.filter(c =>
      c.code.toLowerCase().includes(term) ||
      c.name.toLowerCase().includes(term) ||
      c.dial.includes(term.replace(/^\+?/, '+')) ||
      c.dial.replace('+','').includes(term.replace('+',''))
    );
  }, [search]);

  // Basic country-specific validation to avoid malformed E.164 numbers
  const validatePhoneForCountry = () => {
    const digits = number.replace(/[^0-9]/g, '');
    // US/CA: +1 + 10 digits
    if (countryCode === '+1' && digits.length !== 10) {
      return 'For +1, enter 10 digits (area code + number)';
    }
    // India: +91 + 10 digits
    if (countryCode === '+91' && digits.length !== 10) {
      return 'For +91, enter 10-digit mobile number';
    }
    // Generic sanity check
    if (digits.length < 8 || digits.length > 15) {
      return 'Phone looks too short/long for international format';
    }
    return '';
  };

  const requestOtp = async () => {
    setError(''); setInfo('');
    if (!number) { setError('Enter phone number'); return; }
    const countrySpecific = validatePhoneForCountry();
    if (countrySpecific) { setError(countrySpecific); return; }
    const formatted = fullPhone;
    if (!/^\+[1-9][0-9]{7,15}$/.test(formatted)) { setError('Invalid phone format'); return; }
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/auth/phone/request-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formatted })
      });
      const data = await resp.json().catch(()=>({}));
      if (resp.ok) {
        setInfo('OTP sent to your phone.');
        addToast('success', 'OTP sent to your phone');
        setStep(2);
        setResendIn(60); // backend throttle window
      } else {
        const msg = data.detail || 'Failed to send OTP';
        setError(msg);
        addToast('error', msg);
      }
    } catch (e) {
      setError('Network error while requesting OTP');
      addToast('error', 'Network error while requesting OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError(''); setInfo('');
    const formatted = fullPhone;
    if (!/^\+[1-9][0-9]{7,15}$/.test(formatted)) { setError('Invalid phone format'); return; }
    if (!otp || otp.replace(/\D/g,'').length < 4) { setError('Enter the verification code'); return; }
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/auth/phone/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formatted, otp })
      });
      const data = await resp.json().catch(()=>({}));
      if (resp.ok) {
        setInfo('Phone verified. Set/enter your password to continue.');
        addToast('success', 'Phone verified');
        setStep(3);
      } else {
        const msg = data.detail || 'Invalid or expired OTP';
        setError(msg);
        addToast('error', msg);
      }
    } catch (e) {
      setError('Network error while verifying OTP');
      addToast('error', 'Network error while verifying OTP');
    } finally {
      setLoading(false);
    }
  };

  const doLogin = async (e) => {
    e?.preventDefault();
    setError(''); setInfo('');
    const formatted = fullPhone;
    if (!/^\+[1-9][0-9]{7,15}$/.test(formatted)) { setError('Invalid phone format'); return; }
    if (!otp) { setError('OTP verification required'); setStep(2); return; }
    if (!password) { setError('Enter password'); return; }
    setLoading(true);
    const payload = { phone: formatted, password, otp };
    if (name.trim()) payload.name = name.trim();
    const res = await login(payload);
    setLoading(false);
    if (res.success) {
      addToast('success', 'Signed in successfully');
      navigate(from, { replace: true });
    } else {
      const msg = res.error || 'Login failed';
      setError(msg);
      addToast('error', msg);
    }
  };

  return (
    <AuthLayout>
      <div className="card rounded-2xl p-8 soft-shadow fade-in">
          {/* Toasts */}
          <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map(t => (
              <div key={t.id} className={`px-4 py-2 rounded-lg shadow text-sm ${t.type==='error' ? 'bg-red-600 text-white' : t.type==='success' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-100'}`}>
                {t.message}
              </div>
            ))}
          </div>
          <h1 className="text-2xl font-semibold mb-1" style={{color:'var(--fg-color)'}}>Sign in with phone</h1>
          <p className="text-sm text-muted mb-6">
            {step === 1 && 'Enter your phone number and your name (for new accounts).'}
            {step === 2 && `Enter the verification code sent to ${maskPhone(fullPhone)}.`}
            {step === 3 && 'Enter your password to finish signing in.'}
          </p>
          <div className="mb-4 text-xs" style={{color:'var(--muted-fg)'}}>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-theme">
              <span className={`w-2 h-2 rounded-full ${step>=1?'bg-teal-500':'bg-gray-300'}`} /> Step 1
            </span>
            <span className="mx-2 opacity-60">→</span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-theme">
              <span className={`w-2 h-2 rounded-full ${step>=2?'bg-teal-500':'bg-gray-300'}`} /> Step 2
            </span>
            <span className="mx-2 opacity-60">→</span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-theme">
              <span className={`w-2 h-2 rounded-full ${step>=3?'bg-teal-500':'bg-gray-300'}`} /> Step 3
            </span>
          </div>
          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-2 rounded mb-4 text-sm">{error}</div>}
          {info && !error && <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-4 py-2 rounded mb-4 text-sm">{info}</div>}

          {/* Step 1: Phone + Name */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{color:'var(--fg-color)'}}>Phone Number</label>
                <div className="flex gap-2">
                  <div className="relative" ref={ddRef}>
                    <button type="button" onClick={()=>setOpenDD(v=>!v)} className="w-28 px-2 py-2 rounded-lg border border-theme text-sm flex items-center justify-between gap-1 focus:outline-none" style={{background:'var(--card-bg)', color:'var(--fg-color)'}} aria-haspopup="listbox" aria-expanded={openDD}>
                      <span className="truncate">{(COUNTRY_CODES.find(c=>c.dial===countryCode)||COUNTRY_CODES[0]).flag} {countryCode}</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    {openDD && (
                      <div className="absolute z-20 mt-1 w-64 sm:w-72 rounded-lg shadow-xl border border-theme" role="listbox" style={{background:'var(--card-bg)', color:'var(--fg-color)'}}>
                          <div className="p-2">
                            <input
                              autoFocus
                              value={search}
                              onChange={e=>setSearch(e.target.value)}
                              placeholder="Search country or code"
                              className="input placeholder:opacity-70"
                              style={{height:'38px'}}
                            />
                          </div>
                          <ul className="max-h-60 overflow-y-auto">
                            {filteredCountries.map(c => (
                              <li
                                key={c.code}
                                className="px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer flex items-center justify-between"
                                onClick={()=>{setCountryCode(c.dial); setOpenDD(false);}}
                              >
                                <span className="flex items-center gap-2">
                                  <span>{c.flag}</span>
                                  <span>{c.name}</span>
                                </span>
                                <span style={{color:'var(--muted-fg)'}}>{c.dial}</span>
                              </li>
                            ))}
                            {filteredCountries.length===0 && (
                              <li className="px-3 py-2 text-sm" style={{color:'var(--muted-fg)'}}>No matches</li>
                            )}
                          </ul>
                        </div>
                    )}
                  </div>
                  <input value={number} onChange={e=>setNumber(e.target.value)} placeholder="5551234567" className="flex-1 input" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{color:'var(--fg-color)'}}>Your Name</label>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="John Doe" className="input" />
                <p className="mt-1 text-xs text-muted">Only used if a new account is created for your number.</p>
              </div>
              <button onClick={requestOtp} disabled={loading} className="w-full py-2.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-500 text-white disabled:opacity-50">
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </div>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{color:'var(--fg-color)'}}>Verification code</label>
                <input ref={otpRef} inputMode="numeric" pattern="[0-9]*" maxLength={8} value={otp} onChange={e=>setOtp(e.target.value.replace(/\s/g,''))} placeholder="Enter the code" className="w-full tracking-widest text-center text-lg input" style={{letterSpacing:'0.35em', paddingTop:'12px', paddingBottom:'12px'}} />
                <div className="mt-2 flex items-center justify-between text-xs text-muted">
                  <button type="button" onClick={()=>setStep(1)} className="text-teal-600 dark:text-teal-400 hover:opacity-90">Change phone</button>
                  <button type="button" disabled={resendIn>0 || loading} onClick={requestOtp} className="hover:opacity-90 disabled:opacity-50">{resendIn>0 ? `Resend in ${resendIn}s` : 'Resend OTP'}</button>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={()=>setStep(1)} type="button" className="flex-1 btn-secondary">Back</button>
                <button onClick={verifyOtp} disabled={loading || !otp} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-500 text-white disabled:opacity-50">{loading ? 'Verifying...' : 'Verify code'}</button>
              </div>
            </div>
          )}

          {/* Step 3: Password */}
          {step === 3 && (
            <form onSubmit={doLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-2" style={{color:'var(--fg-color)'}}>Password</label>
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={8} className="input" placeholder="Enter your password" />
                <p className="mt-1 text-xs text-muted">For first-time sign in, this sets your password for the new account.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={()=>setStep(2)} className="flex-1 btn-secondary">Back</button>
                <button disabled={loading} className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-500 text-white disabled:opacity-50">{loading ? 'Signing in...' : 'Sign in'}</button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-muted">
            <button type="button" onClick={()=>navigate('/auth')} className="text-teal-600 dark:text-teal-400 hover:opacity-90">Back to email login</button>
          </div>
    </div>
  </AuthLayout>
  );
};

export default PhoneLoginPage;

// Basic country code list (minimal subset) – expand as needed
const COUNTRY_CODES = [
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { code: 'MX', name: 'Mexico', dial: '+52', flag: '🇲🇽' },
  { code: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹' },
  { code: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪' },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { code: 'RU', name: 'Russia', dial: '+7', flag: '🇷🇺' },
  { code: 'KR', name: 'South Korea', dial: '+82', flag: '🇰🇷' },
  { code: 'CN', name: 'China', dial: '+86', flag: '🇨🇳' }
];
