/**
 * Frontend spam defenses (defense in depth — server rate limits are authoritative).
 * - Honeypot: hidden field humans never fill; bots often do.
 * - Time-trap: rejects submissions faster than a human can type.
 * - Throttle: blocks accidental double-submits.
 */

export const HONEYPOT_FIELD = 'company_website';
export const MIN_SUBMIT_MS = 2500;

export function isHoneypotFilled(data) {
  const v = data?.[HONEYPOT_FIELD];
  return !!v && String(v).trim() !== '';
}

export function isTooFast(startedAtMs, nowMs = Date.now(), minMs = MIN_SUBMIT_MS) {
  if (!startedAtMs) return false;
  return nowMs - startedAtMs < minMs;
}

/** Returns a guard: first call always passes, repeats within cooldownMs are rejected. */
export function createSubmitThrottle(cooldownMs = 5000) {
  let lastAt = null;
  return (nowMs = Date.now()) => {
    if (lastAt !== null && nowMs - lastAt < cooldownMs) return false;
    lastAt = nowMs;
    return true;
  };
}
