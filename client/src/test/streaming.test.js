import { describe, it, expect } from 'vitest';
import { extractStreamingCode } from '@/features/optimization/useStreamingResponse';

describe('extractStreamingCode', () => {
  it('returns empty for empty input', () => {
    expect(extractStreamingCode('')).toBe('');
    expect(extractStreamingCode(null)).toBe('');
  });

  it('extracts complete fenced block', () => {
    const md = 'Here:\n```python\nprint(1)\n```\nDone';
    expect(extractStreamingCode(md)).toBe('print(1)');
  });

  it('prefers last complete block', () => {
    const md = '```python\na\n```\n```python\nb\n```';
    expect(extractStreamingCode(md)).toBe('b');
  });

  it('handles partial streaming block (no closing fence)', () => {
    const md = 'Thinking...\n```python\nprint(hel';
    expect(extractStreamingCode(md)).toBe('print(hel');
  });

  it('returns empty when no fence present', () => {
    expect(extractStreamingCode('just plain text')).toBe('');
  });
});
