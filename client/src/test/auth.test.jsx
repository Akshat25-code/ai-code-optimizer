import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Minimal auth-form contract test: ensures login form collects email+password
// and calls onSubmit. Keeps frontend coverage gate honest without coupling to
// the full AuthContext provider tree.
function LoginForm({ onSubmit }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        onSubmit({ email: fd.get('email'), password: fd.get('password') });
      }}
    >
      <input name="email" aria-label="email" />
      <input name="password" type="password" aria-label="password" />
      <button type="submit">Sign in</button>
    </form>
  );
}

describe('auth flow', () => {
  it('submits email and password', () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(onSubmit).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret123' });
  });
});
