import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/services/apiClient';

const SecurityScanner = ({ code, setCode }) => {
  const [issues, setIssues] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isRedacting, setIsRedacting] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);

  useEffect(() => {
    // Debounce the scanner
    const timer = setTimeout(() => {
      if (code && code.trim().length > 0) {
        scanCode(code);
      } else {
        setIssues([]);
        setHasScanned(false);
      }
    }, 1000); // 1s debounce

    return () => clearTimeout(timer);
  }, [code]);

  const scanCode = async (currentCode) => {
    setIsScanning(true);
    try {
      const res = await apiClient.scanSecrets(currentCode);
      setIssues(res.findings || []);
      setHasScanned(true);
    } catch (err) {
      console.error("Security scan failed", err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleRedact = async () => {
    if (issues.length === 0 || !code) return;
    setIsRedacting(true);
    try {
      const res = await apiClient.redactSecrets(code);
      if (res.redacted_code) {
        setCode(res.redacted_code);
        setIssues([]); // Assume redaction fixes all issues
      }
    } catch (err) {
      console.error("Redaction failed", err);
    } finally {
      setIsRedacting(false);
    }
  };

  const isSecure = hasScanned && issues.length === 0;

  return (
    <div className="flex items-center justify-between mb-3 min-h-[40px]">
      <div className="flex items-center gap-3">
        {isScanning ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface-1)] border border-[var(--card-border)]">
            <svg className="animate-spin w-4 h-4 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs font-medium text-muted">Scanning for secrets...</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {issues.length > 0 ? (
              <motion.div
                key="vulnerable"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30"
              >
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span className="text-xs font-bold text-red-400">{issues.length} {issues.length === 1 ? 'Secret' : 'Secrets'} Exposed</span>
              </motion.div>
            ) : isSecure ? (
              <motion.div
                key="secure"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
              >
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                <span className="text-xs font-bold text-emerald-400">Secure Context</span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {issues.length > 0 && (
          <motion.button
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            onClick={handleRedact}
            disabled={isRedacting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-lg text-xs font-bold transition-colors"
          >
            {isRedacting ? (
              <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
            )}
            [Redact Before AI]
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SecurityScanner;

