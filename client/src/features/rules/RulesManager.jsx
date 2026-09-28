import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, FileCode2, Sparkles, Package, Lightbulb } from 'lucide-react';
import { API_BASE } from '@/config';
import { apiClient } from '@/services/apiClient';

const SEVERITY_COLORS = {
  Critical: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', text: '#ef4444', badge: '#dc2626' },
  High:     { bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.35)', text: '#f97316', badge: '#ea580c' },
  Medium:   { bg: 'rgba(234, 179, 8, 0.10)',  border: 'rgba(234, 179, 8, 0.30)',  text: '#eab308', badge: '#ca8a04' },
  Low:      { bg: 'rgba(34, 197, 94, 0.10)',  border: 'rgba(34, 197, 94, 0.30)',  text: '#22c55e', badge: '#16a34a' },
  Info:     { bg: 'rgba(59, 130, 246, 0.10)', border: 'rgba(59, 130, 246, 0.30)', text: '#3b82f6', badge: '#2563eb' },
};

export default function RulesManager() {
  const [packs, setPacks] = useState({});
  const [activePacks, setActivePacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedPack, setExpandedPack] = useState(null);
  const [error, setError] = useState('');
  const [savedTick, setSavedTick] = useState(false);

  useEffect(() => {
    fetchPacks();
  }, []);

  const fetchPacks = async () => {
    try {
      const res = await fetch(`${API_BASE}/rules/packs`, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPacks(data);
      // Restore the user's saved selection; default to all packs on first run.
      try {
        const saved = await apiClient.getUserRules();
        const known = Object.keys(data);
        const restored = (saved.active_packs || []).filter((p) => known.includes(p));
        setActivePacks(restored.length ? restored : known);
      } catch {
        setActivePacks(Object.keys(data));
      }
    } catch (err) {
      setError(err.message || 'Failed to load rule packs');
    } finally {
      setLoading(false);
    }
  };

  const togglePack = (packName) => {
    setActivePacks(prev =>
      prev.includes(packName) ? prev.filter(p => p !== packName) : [...prev, packName]
    );
  };

  const saveSelection = async () => {
    setSaving(true);
    setError('');
    try {
      await apiClient.saveUserRules(activePacks, []);
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 2000);
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const getPackStats = (rules) => {
    const bySeverity = {};
    rules.forEach(r => {
      bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
    });
    return bySeverity;
  };

  const packMeta = {
    'security-owasp': { icon: <Shield size={20} />, label: 'Security (OWASP)', desc: 'Detects dangerous function calls, hardcoded secrets, and weak cryptography.' },
    'python-style':   { icon: <FileCode2 size={20} />, label: 'Python Style',      desc: 'Enforces PEP8 best practices: no bare except, no wildcard imports, no globals.' },
    'clean-code':     { icon: <Sparkles size={20} />, label: 'Clean Code',         desc: 'Limits function length and cyclomatic complexity to keep code maintainable.' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 opacity-50">
        <div className="animate-spin w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full mr-3" />
        Loading rule packs...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--fg-color)' }}>Rules Engine</h2>
          <p className="text-xs opacity-60">Toggle rule packs to enforce coding standards on your code.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1 rounded-full font-mono" style={{ background: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6', border: '1px solid rgba(20, 184, 166, 0.3)' }}>
            {activePacks.length} / {Object.keys(packs).length} Active
          </span>
          <button
            onClick={saveSelection}
            disabled={saving}
            className="text-xs px-3 py-1 rounded-full font-semibold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50"
          >
            {saving ? 'Saving…' : savedTick ? 'Saved ✓' : 'Save selection'}
          </button>
        </div>
      </div>
      {error && (
        <div role="alert" className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {Object.entries(packs).map(([packName, rules]) => {
        const meta = packMeta[packName] || { icon: <Package size={20} />, label: packName, desc: '' };
        const isActive = activePacks.includes(packName);
        const isExpanded = expandedPack === packName;
        const stats = getPackStats(rules);

        return (
          <motion.div
            key={packName}
            layout
            className="rounded-xl overflow-hidden border transition-all"
            style={{
              borderColor: isActive ? 'rgba(20, 184, 166, 0.4)' : 'var(--card-border)',
              background: isActive ? 'rgba(20, 184, 166, 0.05)' : 'var(--card-bg)',
            }}
          >
            {/* Pack Header */}
            <div className="flex items-center justify-between px-4 py-3 cursor-pointer select-none" onClick={() => setExpandedPack(isExpanded ? null : packName)}>
              <div className="flex items-center gap-3">
                <span className="text-teal-300">{meta.icon}</span>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--fg-color)' }}>{meta.label}</h3>
                  <p className="text-xs opacity-50">{meta.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Severity badges */}
                <div className="flex gap-1">
                  {Object.entries(stats).map(([sev, count]) => {
                    const c = SEVERITY_COLORS[sev] || SEVERITY_COLORS.Info;
                    return (
                      <span key={sev} className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                        {count} {sev}
                      </span>
                    );
                  })}
                </div>
                {/* Toggle */}
                <button
                  onClick={(e) => { e.stopPropagation(); togglePack(packName); }}
                  className="relative w-10 h-5 rounded-full transition-colors"
                  style={{ background: isActive ? '#14b8a6' : 'rgba(100, 116, 139, 0.3)' }}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                    style={{ left: isActive ? '22px' : '2px' }}
                  />
                </button>
              </div>
            </div>

            {/* Expanded Rules List */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-2 border-t" style={{ borderColor: 'var(--card-border)' }}>
                    {rules.map((rule, i) => {
                      const c = SEVERITY_COLORS[rule.severity] || SEVERITY_COLORS.Info;
                      return (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg text-sm" style={{ background: 'rgba(0,0,0,0.15)' }}>
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold mt-0.5 shrink-0" style={{ background: c.badge, color: 'white' }}>
                            {rule.severity}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium" style={{ color: 'var(--fg-color)' }}>{rule.name}</div>
                            <div className="text-xs opacity-60 mt-0.5">{rule.description}</div>
                            {rule.autofix && (
                              <div className="text-xs mt-1 flex items-center gap-1.5">
                                <Lightbulb size={12} className="text-emerald-400" />
                                <span className="text-emerald-400/80">{rule.autofix}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

