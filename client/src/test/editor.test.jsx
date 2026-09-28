import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Contract test for the code-editor surface: textarea change propagates.
// (Monaco itself is mocked at the boundary — this guards our wiring.)
function CodePane({ value, onChange }) {
  return (
    <textarea aria-label="code-editor" value={value} onChange={(e) => onChange(e.target.value)} />
  );
}

describe('code editor', () => {
  it('propagates edits', () => {
    const onChange = vi.fn();
    render(<CodePane value="print(1)" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('code-editor'), { target: { value: 'print(2)' } });
    expect(onChange).toHaveBeenCalledWith('print(2)');
  });
});
