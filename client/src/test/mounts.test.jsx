import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import FindingsPanel from '@/features/review/FindingsPanel';
import ViolationsPanel from '@/features/rules/ViolationsPanel';
import ReviewPanel from '@/features/review/ReviewPanel';
import SessionsDrawer from '@/features/sessions/SessionsDrawer';

const finding = {
  line: 3,
  category: 'security',
  severity: 'High',
  confidence: 0.9,
  message: 'Shell subprocess with shell=True',
  stage: 'Security Scan',
};

describe('mounted review/rules components', () => {
  it('FindingsPanel renders findings and null on empty', () => {
    const { container, rerender } = render(<FindingsPanel findings={[finding]} />);
    expect(container.textContent).toContain('Shell subprocess');
    expect(container.textContent).toContain('High');
    rerender(<FindingsPanel findings={[]} />);
    expect(container.textContent).toBe('');
  });

  it('ViolationsPanel renders violations with score', () => {
    render(
      <ViolationsPanel
        violations={[{ rule_name: 'No Eval', line: 2, severity: 'High', message: 'Avoid eval', snippet: 'eval(x)' }]}
        complianceScore={82}
      />,
    );
    expect(document.body.textContent).toContain('No Eval');
    expect(document.body.textContent).toContain('82');
  });

  it('ReviewPanel shows empty state without code and never fetches', () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no net'));
    render(<ReviewPanel code="" language="python" />);
    expect(document.body.textContent).toMatch(/run a review/i);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('SessionsDrawer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('lists sessions and opens one into the editor', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => [
        { id: 's1', title: null, language: 'python', task: 'optimization', provider_used: 'openai', tokens_in: 10, tokens_out: 5, code: 'print(1)' },
      ],
    });
    const onOpen = vi.fn();
    render(<SessionsDrawer onOpenSession={onOpen} />);
    await waitFor(() => expect(screen.getByText(/python · optimization/i)).toBeTruthy());
    screen.getByTitle('Open in editor').click();
    expect(onOpen).toHaveBeenCalledWith('print(1)', 'python');
  });

  it('shows empty state when no sessions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => [],
    });
    render(<SessionsDrawer onOpenSession={() => {}} />);
    await waitFor(() => expect(screen.getByText(/no sessions yet/i)).toBeTruthy());
  });
});
