import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getConsent, setConsent, canTrack, isDntEnabled } from '@/lib/analytics';

// In-memory localStorage stub (jsdom here ships without one).
function installStorageStub() {
  let store = {};
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      clear: () => { store = {}; },
    },
    configurable: true,
  });
}

beforeEach(() => {
  installStorageStub();
});

describe('cookie consent + analytics gating', () => {
  it('defaults to pending and tracks nothing when unconfigured', () => {
    localStorage.clear();
    expect(getConsent()).toBe('pending');
    // No VITE_ANALYTICS_* in test env -> canTrack must be false regardless.
    expect(canTrack()).toBe(false);
  });

  it('persists choice and notifies listeners', () => {
    localStorage.clear();
    const seen = [];
    const listener = (e) => seen.push(e.detail);
    window.addEventListener('aco-consent-change', listener);
    setConsent('accepted');
    expect(getConsent()).toBe('accepted');
    setConsent('declined');
    expect(getConsent()).toBe('declined');
    expect(seen).toEqual(['accepted', 'declined']);
    window.removeEventListener('aco-consent-change', listener);
  });

  it('still refuses tracking when unconfigured even after accept', () => {
    localStorage.clear();
    setConsent('accepted');
    expect(canTrack()).toBe(false);
  });

  it('detects Do Not Track', () => {
    expect(typeof isDntEnabled()).toBe('boolean');
  });

  it('never fires network requests when unconfigured', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no net'));
    const { trackPageview, trackEvent } = await import('@/lib/analytics');
    trackPageview();
    trackEvent('demo', { x: 1 });
    trackEvent('');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
