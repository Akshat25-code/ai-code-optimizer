import React from 'react';

/** Simple line-based diff viewer (no external deps). */
function computeDiff(original = '', modified = '') {
  const a = original.split('\n');
  const b = modified.split('\n');
  const rows = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i += 1) {
    const left = a[i];
    const right = b[i];
    if (left === right) {
      rows.push({ type: 'same', line: i + 1, left, right });
    } else if (left === undefined) {
      rows.push({ type: 'add', line: i + 1, left: '', right });
    } else if (right === undefined) {
      rows.push({ type: 'remove', line: i + 1, left, right: '' });
    } else {
      rows.push({ type: 'change', line: i + 1, left, right });
    }
  }
  return rows;
}

const rowStyle = {
  same: { bg: 'transparent', color: 'var(--fg-color, #e2e8f0)' },
  add: { bg: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7' },
  remove: { bg: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' },
  change: { bg: 'rgba(245, 158, 11, 0.12)', color: '#fcd34d' },
};

export default function DiffViewer({ original = '', modified = '', title = 'Diff' }) {
  const rows = computeDiff(original, modified);
  const changed = rows.filter((r) => r.type !== 'same').length;

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-color, #334155)' }}>
      <div className="px-3 py-2 text-xs font-semibold flex justify-between" style={{ background: 'var(--panel-bg, #1e293b)' }}>
        <span>{title}</span>
        <span style={{ color: 'var(--muted-color, #94a3b8)' }}>{changed} changed line(s)</span>
      </div>
      <div className="max-h-80 overflow-auto font-mono text-xs">
        <div className="grid grid-cols-2 divide-x" style={{ divideColor: 'var(--border-color, #334155)' }}>
          <div className="px-2 py-1 text-[10px] uppercase tracking-wide opacity-60">Original</div>
          <div className="px-2 py-1 text-[10px] uppercase tracking-wide opacity-60">Optimized</div>
        </div>
        {rows.map((row) => {
          const s = rowStyle[row.type];
          return (
            <div key={row.line} className="grid grid-cols-2 divide-x" style={{ background: s.bg, divideColor: 'var(--border-color, #334155)' }}>
              <pre className="px-2 py-0.5 m-0 whitespace-pre-wrap break-all" style={{ color: row.type === 'add' ? 'transparent' : s.color }}>
                {row.left ?? ''}
              </pre>
              <pre className="px-2 py-0.5 m-0 whitespace-pre-wrap break-all" style={{ color: row.type === 'remove' ? 'transparent' : s.color }}>
                {row.right ?? ''}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}

