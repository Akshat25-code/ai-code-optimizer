import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Copy, Check, Clock, Globe, Shield, X } from 'lucide-react';
import { API_BASE } from '@/config';

export default function ShareModal({ isOpen, onClose, sessionId, snapshotData }) {
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [expiresIn, setExpiresIn] = useState('24');

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/share/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          expires_in_hours: parseInt(expiresIn, 10),
          read_only: true,
          snapshot_data: snapshotData
        })
      });

      if (res.ok) {
        const data = await res.json();
        setShareLink(`${window.location.origin}/share/${data.token}`);
      }
    } catch (err) {
      console.error("Share error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md p-6 rounded-2xl border shadow-2xl"
        style={{ background: 'var(--bg-color)', borderColor: 'var(--card-border)' }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-teal-500/20 text-teal-400">
            <Share2 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: 'var(--fg-color)' }}>Share Session</h2>
            <p className="text-sm text-slate-400">Create a secure, read-only snapshot link.</p>
          </div>
        </div>

        {!shareLink ? (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
              <Shield className="text-amber-400 shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-amber-200/80">
                Shared links grant <strong>unauthenticated</strong> read-only access to this specific snapshot of your code. They automatically expire.
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Clock size={14} /> Expiration
              </label>
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-teal-500"
              >
                <option value="1">1 Hour</option>
                <option value="24">24 Hours</option>
                <option value="72">3 Days</option>
                <option value="168">7 Days</option>
              </select>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Generating...' : 'Generate Secure Link'}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex gap-3">
              <Globe className="text-emerald-400 shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-emerald-200/80">
                Your secure link is ready. Anyone with this link can view a read-only snapshot.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareLink}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm font-mono text-slate-300 focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="p-2.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition border border-slate-700"
              >
                {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

