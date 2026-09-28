/**
 * Privacy-first analytics: consent-gated, Do-Not-Track aware, off unless configured.
 *
 * Configure with (all optional, non-secret):
 *   VITE_ANALYTICS_ENDPOINT - event API base, e.g. https://plausible.example.com/api/event
 *   VITE_ANALYTICS_DOMAIN   - site id sent with every event
 * Nothing is ever sent before the user accepts in the cookie banner,
 * and DNT: 1 opts out permanently regardless of consent.
 */

const CONSENT_KEY = 'aco-consent';
const ENDPOINT = import.meta.env.VITE_ANALYTICS_ENDPOINT || '';
const DOMAIN = import.meta.env.VITE_ANALYTICS_DOMAIN || '';

export function getConsent() {
  try {
    return localStorage.getItem(CONSENT_KEY) || 'pending';
  } catch {
    return 'pending';
  }
}

export function setConsent(value) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* private mode — consent simply won't persist */
  }
  window.dispatchEvent(new CustomEvent('aco-consent-change', { detail: value }));
}

export function isDntEnabled() {
  return (
    navigator.doNotTrack === '1' ||
    window.doNotTrack === '1' ||
    navigator.msDoNotTrack === '1'
  );
}

export function canTrack() {
  if (!ENDPOINT || !DOMAIN) return false;
  if (isDntEnabled()) return false;
  return getConsent() === 'accepted';
}

function send(payload) {
  if (!canTrack()) return;
  try {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: DOMAIN, url: window.location.href, ...payload }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* analytics must never break the app */
  }
}

export function trackPageview() {
  send({ name: 'pageview' });
}

export function trackEvent(name, props = {}) {
  if (!name) return;
  send({ name, props });
}
