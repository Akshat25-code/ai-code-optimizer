/** Shared client-side form validators. Return '' when valid, else an error message. */

export function validateRequired(value, label = 'This field') {
  return value && String(value).trim() ? '' : `${label} is required.`;
}

export function validateEmail(value) {
  if (!value || !String(value).trim()) return 'Email address is required.';
  // Practical RFC-5322 subset — full check happens server-side.
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());
  return ok ? '' : 'Enter a valid email address.';
}

export function validatePassword(value, { minLength = 8 } = {}) {
  if (!value) return 'Password is required.';
  if (value.length < minLength) return `Password must be at least ${minLength} characters.`;
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) {
    return 'Password must include both letters and numbers.';
  }
  return '';
}

export function validateName(value) {
  if (!value || !String(value).trim()) return 'Full name is required.';
  if (String(value).trim().length < 2) return 'Full name looks too short.';
  return '';
}

/** Run a {field: validator} map against values; returns {field: message} for failures. */
export function validateForm(values, schema) {
  const errors = {};
  for (const [field, fn] of Object.entries(schema)) {
    const msg = fn(values[field]);
    if (msg) errors[field] = msg;
  }
  return errors;
}
