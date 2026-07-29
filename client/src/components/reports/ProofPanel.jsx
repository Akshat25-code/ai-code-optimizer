import React from 'react';
import ExportReportPanel from './ExportReportPanel';
import GitHubPRPanel from '@/features/github/GitHubPRPanel';

const badgeStyle = (status) => {
  if (status === 'passed') return { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.35)' };
  if (status === 'failed') return { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.35)' };
  if (status === 'warning') return { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.35)' };
  return { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', border: 'rgba(148,163,184,0.25)' };
};

export default function ProofPanel({
  inspection,
  verification,
  runCompare,
  testResults,
  secretsScan,
  providerStatus,
  repoHealth,
  githubContext,
  optimizedCode,
  originalCode,
  language,
}) {
  const panel = verification?.proof_panel || {};
  const badges = verification?.proof_badges || inspection?.proof_badges || [];
  const health = repoHealth ?? inspection?.score ?? null;

  const metrics = [
    { label: 'Output Match', value: panel.output_match ?? runCompare?.output_match ?? 'â€”' },
    { label: 'Original Runtime', value: panel.original_runtime_ms != null ? `${panel.original_runtime_ms} ms` : (runCompare?.original?.exec_time_ms != null ? `${runCompare.original.exec_time_ms} ms` : 'â€”') },
    { label: 'Optimized Runtime', value: panel.optimized_runtime_ms != null ? `${panel.optimized_runtime_ms} ms` : (runCompare?.optimized?.exec_time_ms != null ? `${runCompare.optimized.exec_time_ms} ms` : 'â€”') },
    { label: 'Speed Gain', value: panel.speed_gain_pct != null ? `${panel.speed_gain_pct}%` : (runCompare?.speed_improvement_pct != null ? `${runCompare.speed_improvement_pct}%` : 'â€”') },
    { label: 'Tests', value: testResults ? (testResults.passed ? 'Passed' : 'Failed') : 'â€”' },
    { label: 'Status', value: panel.status || verification?.status || 'Pending' },
  ];

  return (
    <div className="space-y-4">
      {providerStatus?.fake_ai_visible && (
        <div className="px-3 py-2 rounded-lg text-xs font-medium" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.35)' }}>
          Dev mode: AI fake responses enabled (ALLOW_FAKE_AI=1)
        </div>
      )}

      {health != null && (
        <div className="rounded-lg p-3 border" style={{ borderColor: 'var(--border-color, #334155)' }}>
          <div className="text-xs uppercase tracking-wide opacity-60 mb-1">Project Health</div>
          <div className="text-2xl font-bold" style={{ color: health >= 85 ? '#10b981' : health >= 60 ? '#f59e0b' : '#ef4444' }}>
            {health}/100
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {badges.map((b) => {
          const s = badgeStyle(b.status);
          return (
            <span
              key={b.label}
              className="px-2 py-1 rounded-full text-[11px] font-semibold border"
              style={{ background: s.bg, color: s.color, borderColor: s.border }}
              title={b.detail || ''}
            >
              {b.label}: {b.status}
            </span>
          );
        })}
      </div>

      <div className="rounded-lg border divide-y text-sm" style={{ borderColor: 'var(--border-color, #334155)', divideColor: 'var(--border-color, #334155)' }}>
        {metrics.map((m) => (
          <div key={m.label} className="flex justify-between px-3 py-2">
            <span className="opacity-70">{m.label}</span>
            <span className="font-medium">{String(m.value)}</span>
          </div>
        ))}
      </div>

      {secretsScan?.has_secrets && (
        <div className="rounded-lg p-3 text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          Warning: {secretsScan.count} possible secret(s) found. Redact before sending to AI.
        </div>
      )}

      {inspection?.findings?.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2">Top Findings</div>
          <ul className="space-y-1 text-xs max-h-40 overflow-auto">
            {inspection.findings.slice(0, 5).map((f, i) => (
              <li key={i} className="opacity-90">
                <span className="font-semibold" style={{ color: f.severity === 'Critical' ? '#ef4444' : '#f59e0b' }}>{f.severity}</span>
                {' â€” '}{f.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Export Report Section */}
      <ExportReportPanel
        reportData={{
          title: 'Code Intelligence Report',
          language: language || 'Auto',
          task: 'optimization',
          original_code: originalCode || 'Source provided in editor',
          inspection: inspection,
          verification: verification,
          test_results: testResults,
        }}
        disabled={!inspection && !verification}
      />

      {/* GitHub PR Section */}
      <GitHubPRPanel
        githubContext={githubContext}
        optimizedCode={optimizedCode}
        disabled={!verification}
      />
    </div>
  );
}

