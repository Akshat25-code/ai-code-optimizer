import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE } from '@/config';

/**
 * Public read-only view for shared snapshots (/share/:token).
 * No auth required by design (backend enforces expiry + read-only).
 */
export default function SharedSessionPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Shared snapshot — AI Code Optimizer';
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/share/${encodeURIComponent(token)}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.detail || `HTTP ${res.status}`);
        setData(body);
      } catch (err) {
        setError(err.message || 'Could not load shared snapshot');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const code = data?.snapshot_data?.code || data?.snapshot_data?.optimized_code || '';

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <p className="text-xs font-bold uppercase tracking-widest text-muted mb-2">Shared snapshot · read-only</p>
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--fg-color)' }}>Shared code</h1>
      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && (
        <div className="space-y-4">
          <div role="alert" className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>
          <Link to="/" className="inline-block text-sm text-teal-700 dark:text-teal-300 underline underline-offset-4">Back home</Link>
        </div>
      )}
      {data && !error && (
        <pre className="text-sm font-mono p-4 rounded-xl overflow-auto max-h-[60vh] border" style={{ background: 'rgba(0,0,0,0.3)', borderColor: 'var(--card-border)', color: 'var(--fg-color)' }}>
          {code || '(empty snapshot)'}
        </pre>
      )}
    </main>
  );
}
