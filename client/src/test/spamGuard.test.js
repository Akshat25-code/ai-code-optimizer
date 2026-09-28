import { describe, it, expect } from 'vitest';
import {
  HONEYPOT_FIELD,
  isHoneypotFilled,
  isTooFast,
  createSubmitThrottle,
} from '@/lib/spamGuard';

describe('spamGuard', () => {
  it('flags filled honeypots', () => {
    expect(isHoneypotFilled({})).toBe(false);
    expect(isHoneypotFilled({ [HONEYPOT_FIELD]: '' })).toBe(false);
    expect(isHoneypotFilled({ [HONEYPOT_FIELD]: 'bot' })).toBe(true);
  });

  it('traps inhumanly fast submits', () => {
    expect(isTooFast(1000, 1500)).toBe(true);
    expect(isTooFast(1000, 5000)).toBe(false);
    expect(isTooFast(null, 5000)).toBe(false);
  });

  it('throttles double submits', () => {
    const allow = createSubmitThrottle(5000);
    expect(allow(1000)).toBe(true);
    expect(allow(2000)).toBe(false);
    expect(allow(7000)).toBe(true);
  });
});
