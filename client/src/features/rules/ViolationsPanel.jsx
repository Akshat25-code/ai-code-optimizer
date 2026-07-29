import React from 'react';
import { motion } from 'framer-motion';

const SEVERITY_COLORS = {
  Critical: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)', text: '#ef4444', icon: 'ðŸ”´' },
  High:     { bg: 'rgba(249, 115, 22, 0.10)', border: 'rgba(249, 115, 22, 0.30)', text: '#f97316', icon: 'ðŸŸ ' },
  Medium:   { bg: 'rgba(234, 179, 8, 0.08)',  border: 'rgba(234, 179, 8, 0.25)',  text: '#eab308', icon: 'ðŸŸ¡' },
  Low:      { bg: 'rgba(34, 197, 94, 0.08)',  border: 'rgba(34, 197, 94, 0.25)',  text: '#22c55e', icon: 'ðŸŸ¢' },
  Info:     { bg: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.25)', text: '#3b82f6', icon: 'â„¹ï¸' },
};

const SEVERITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3, Info: 4 };

export default function ViolationsPanel({ violations = [], complianceScore = 100, onJumpToLine }) {
  if (!violations || violations.length === 0) {
    return (
      <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
        <div className="text-3xl mb-2">âœ…</div>
        <div className="font-semibold text-emerald-400 text-sm">No Rule Violations</div>
        <div className="text-xs opacity-50 mt-1">Your code passes all active linting rules.</div>
      </div>
    );
  }

  // Group by severity
  const grouped = {};
  violations.forEach(v => {
    if (!grouped[v.severity]) grouped[v.severity] = [];
    grouped[v.severity].push(v);
  });

  const sortedGroups = Object.entries(grouped).sort(
    ([a], [b]) => (SEVERITY_ORDER[a] ?? 99) - (SEVERITY_ORDER[b] ?? 99)
  );

  const scoreColor = complianceScore >= 80 ? '#10b981' : complianceScore >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="space-y-4">
      {/* Score Header */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
        <div>
          <div className="text-xs uppercase tracking-wider opacity-50 font-semibold">Compliance Score</div>
          <div className="text-2xl font-bold" style={{ color: scoreColor }}>{complianceScore}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full font-mono" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            {violations.length} {violations.length === 1 ? 'violation' : 'violations'}
          </span>
        </div>
      </div>

      {/* Grouped Violations */}
      {sortedGroups.map(([severity, items]) => {
        const c = SEVERITY_COLORS[severity] || SEVERITY_COLORS.Info;
        return (
          <div key={severity} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${c.border}`, background: c.bg }}>
            <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: `1px solid ${c.border}` }}>
              <div className="flex items-center gap-2">
                <span>{c.icon}</span>
                <span className="font-semibold text-sm" style={{ color: c.text }}>{severity}</span>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: `${c.text}20`, color: c.text }}>
                {items.length}
              </span>
            </div>
            <div className="p-3 space-y-2">
              {items.map((v, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-start gap-3 p-3 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ background: 'rgba(0,0,0,0.15)' }}
                  onClick={() => onJumpToLine?.(v.line)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm" style={{ color: 'var(--fg-color)' }}>{v.rule_name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--fg-color)' }}>
                        Line {v.line}
                      </span>
                    </div>
                    <div className="text-xs opacity-70 mb-1">{v.message}</div>
                    {v.snippet && (
                      <pre className="text-[11px] font-mono p-2 rounded mt-1 overflow-x-auto" style={{ background: 'rgba(0,0,0,0.25)', color: 'var(--fg-color)' }}>
                        {v.snippet}
                      </pre>
                    )}
                    {v.autofix && (
                      <div className="text-xs mt-2 flex items-center gap-1.5">
                        <span className="text-emerald-400">ðŸ’¡</span>
                        <span className="text-emerald-400/80">{v.autofix}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

