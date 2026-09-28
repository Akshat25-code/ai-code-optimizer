import React, { useState, useEffect } from 'react';
import { History, Trash2, Download, FolderOpen } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { API_BASE } from '@/config';

/**
 * Session history: list past optimization sessions, re-open one into the
 * editor, delete, or export all as JSON. Mounted in the workspace sidebar.
 */
export default function SessionsDrawer({ onOpenSession }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setSessions(await apiClient.listSessions(50));
    } catch (err) {
      setError(err.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id) => {
    try {
      await apiClient.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err.message || 'Delete failed');
    }
  };

  if (loading) return <div className="py-8 text-center text-sm text-muted">Loading sessions…</div>;
  if (error) {
    return (
      <div className="space-y-3">
        <div role="alert" className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</div>
        <button type="button" onClick={load} className="text-xs px-3 py-1.5 rounded border opacity-80">Retry</button>
      </div>
    );
  }
  if (!sessions.length) {
    return (
      <div className="py-10 text-center">
        <History size={32} className="mx-auto text-slate-500 mb-3 opacity-60" />
        <p className="text-sm font-semibold" style={{ color: 'var(--fg-color)' }}>No sessions yet</p>
        <p className="text-xs text-muted mt-1">Run an optimization and it will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <a
          href={`${API_BASE}/opt-sessions/export`}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border opacity-80 hover:opacity-100"
        >
          <Download size={12} /> Export all (JSON)
        </a>
      </div>
      {sessions.map((s) => (
        <div
          key={s.id}
          className="flex items-center gap-2 p-3 rounded-lg border bg-black/20"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: 'var(--fg-color)' }}>
              {s.title || `${s.language} · ${s.task}`}
            </div>
            <div className="text-[11px] text-muted">
              {s.provider_used || 'local'} · {s.tokens_in + s.tokens_out} tokens
            </div>
          </div>
          <button
            type="button"
            title="Open in editor"
            onClick={() => onOpenSession && onOpenSession(s.code || '', s.language)}
            className="p-1.5 rounded hover:bg-white/10 text-teal-300"
          >
            <FolderOpen size={14} />
          </button>
          <button
            type="button"
            title="Delete session"
            onClick={() => remove(s.id)}
            className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-red-300"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
