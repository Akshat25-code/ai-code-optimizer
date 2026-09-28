import { describe, it, expect } from 'vitest';
import {
  validateRequired,
  validateEmail,
  validatePassword,
  validateName,
  validateForm,
} from '@/lib/validation';

describe('validation', () => {
  it('requires non-blank values', () => {
    expect(validateRequired('x')).toBe('');
    expect(validateRequired('  ')).not.toBe('');
    expect(validateRequired('')).not.toBe('');
  });

  it('validates email shape', () => {
    expect(validateEmail('a@b.com')).toBe('');
    expect(validateEmail('nope')).not.toBe('');
    expect(validateEmail('a@b')).not.toBe('');
    expect(validateEmail('')).not.toBe('');
  });

  it('enforces password policy', () => {
    expect(validatePassword('secret123')).toBe('');
    expect(validatePassword('short1')).not.toBe('');
    expect(validatePassword('allletterss')).not.toBe('');
    expect(validatePassword('12345678')).not.toBe('');
  });

  it('validates names', () => {
    expect(validateName('Ada')).toBe('');
    expect(validateName('x')).not.toBe('');
  });

  it('validates a whole form', () => {
    const errors = validateForm(
      { email: 'bad', password: 'secret123' },
      { email: validateEmail, password: validatePassword },
    );
    expect(errors).toEqual({ email: expect.any(String) });
  });
});
