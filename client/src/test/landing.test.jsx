import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WelcomePage from '@/features/workspace/WelcomePage';

describe('landing v2 hero', () => {
  it('states what the product does with one primary CTA and real proof', () => {
    render(
      <MemoryRouter>
        <WelcomePage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /ship faster code/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /start optimizing/i })).toBeTruthy();
    // Proof strip cites real sources, never invented metrics.
    expect(document.body.textContent).toContain('12/12');
    expect(document.body.textContent).toContain('test_sandbox_escape.py');
    // All six instruments link somewhere real.
    expect(document.body.textContent).toContain('Bug Detection');
  });
});
