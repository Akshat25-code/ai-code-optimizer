import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertCircle, Info, Shield, Check, GitMerge } from 'lucide-react';

const SEVERITY_COLORS = {
  Critical: 'text-red-400 bg-red-400/10 border-red-400/20',
  High: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  Medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Low: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
};

const SEVERITY_ICONS = {
  Critical: <AlertOctagon size={16} />,
  High: <AlertTriangle size={16} />,
  Medium: <AlertCircle size={16} />,
  Low: <Info size={16} />,
};

// Fallback icon since AlertOctagon isn't imported from lucide-react above
const DefaultIcon = <AlertTriangle size={16} />;

export default function FindingsPanel({ findings = [] }) {
  if (!findings || findings.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--fg-color)' }}>
        <Shield size={20} className="text-teal-400" />
        Review Findings ({findings.length})
      </h3>

      <div className="space-y-3">
        <AnimatePresence>
          {findings.map((finding, idx) => (
            <motion.div
              key={`${finding.line}-${finding.category}-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-4 rounded-xl border flex flex-col gap-3"
              style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold border flex items-center gap-1 ${SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.Low}`}>
                     {finding.severity}
                  </span>

                  <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs font-mono uppercase border border-slate-700">
                    {finding.category}
                  </span>

                  {finding.stage.includes(',') && (
                    <span className="px-2 py-1 rounded bg-teal-900/30 text-teal-400 text-xs flex items-center gap-1 border border-teal-800/50" title="Found by multiple stages (High Confidence)">
                      <GitMerge size={12} /> Multi-Stage
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Confidence</div>
                    <div className="text-sm font-bold text-teal-400">
                      {Math.round(finding.confidence * 100)}%
                    </div>
                  </div>

                  {finding.line && (
                    <button className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-sm font-medium transition-colors border border-indigo-500/20">
                      Line {finding.line}
                    </button>
                  )}
                </div>
              </div>

              <div className="text-sm text-slate-300 ml-1 leading-relaxed">
                {finding.message}
              </div>

              {finding.autofix && (
                <div className="mt-2 p-3 rounded-lg bg-black/40 border border-slate-800">
                  <div className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-1">
                    <Check size={14} /> Suggested Fix
                  </div>
                  <pre className="text-sm font-mono text-slate-300 overflow-x-auto">
                    <code>{finding.autofix}</code>
                  </pre>
                </div>
              )}

              <div className="mt-2 text-xs text-slate-500 flex gap-2">
                Found by: <span className="font-mono text-slate-400">{finding.stage}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

