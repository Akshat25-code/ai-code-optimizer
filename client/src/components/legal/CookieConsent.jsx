import React, { useCallback, useEffect, useState } from 'react';
import { getConsent, setConsent } from '@/lib/analytics';

/**
 * Cookie consent banner. Choice persists in localStorage; analytics only
 * loads after "accepted" (see lib/analytics.js). Re-openable via the
 * 'aco-open-cookie-settings' window event (footer link dispatches it).
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsent() === 'pending') setVisible(true);
    const reopen = () => setVisible(true);
    window.addEventListener('aco-open-cookie-settings', reopen);
    return () => window.removeEventListener('aco-open-cookie-settings', reopen);
  }, []);

  const choose = useCallback((value) => {
    setConsent(value);
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[100] rounded-2xl p-5 shadow-2xl"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--card-border)' }}
    >
      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--fg-color)' }}>
        We value your privacy
      </p>
      <p className="text-sm text-muted leading-relaxed">
        We use strictly-necessary cookies for sign-in and theme, and optional
        analytics cookies to improve the product. See our{' '}
        <a href="/privacy" className="underline underline-offset-2 text-teal-700 dark:text-teal-300">
          Privacy Policy
        </a>
        .
      </p>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => choose('declined')}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-medium btn-secondary"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => choose('accepted')}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
