import React from 'react';
import { motion } from 'framer-motion';
import FeaturePageLayout from '../components/FeaturePageLayout';
import useCodeOptimizer from '../hooks/useCodeOptimizer';

const AnalysisPage = () => {
  const optimizer = useCodeOptimizer('analysis', true);

  const getScoreColor = (score) => {
    if (score >= 8) return '#10b981';
    if (score >= 6) return '#f59e0b';
    if (score >= 4) return '#f97316';
    return '#ef4444';
  };

  const getScoreBg = (score) => {
    if (score >= 8) return 'rgba(16, 185, 129, 0.15)';
    if (score >= 6) return 'rgba(245, 158, 11, 0.15)';
    if (score >= 4) return 'rgba(249, 115, 22, 0.15)';
    return 'rgba(239, 68, 68, 0.15)';
  };

  const categories = [
    { key: 'code_structure', label: 'Structure', icon: '🏗️' },
    { key: 'performance', label: 'Performance', icon: '⚡' },
    { key: 'security', label: 'Security', icon: '🔒' },
    { key: 'maintainability', label: 'Maintainability', icon: '🔧' },
    { key: 'readability', label: 'Readability', icon: '📖' },
    { key: 'best_practices', label: 'Best Practices', icon: '✨' },
    { key: 'complexity', label: 'Complexity', icon: '🧩' },
  ];

  // Results section with professional report card
  const resultsSection = (
    <div className="space-y-4">
      {!optimizer.optimizedCode ? (
        <div className="h-full flex items-center justify-center rounded-xl p-12" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
          <div className="text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--fg-color)' }}>Ready to Analyze</h3>
            <p className="text-sm text-muted">Enter your code to receive a comprehensive quality assessment</p>
          </div>
        </div>
      ) : optimizer.analysisReport ? (
        <div className="space-y-4">
          {/* Report Card Header */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)', border: `1px solid var(--card-border)` }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--fg-color)' }}>📊 Code Analysis Report Card</h2>
                  <p className="text-sm text-muted mt-1">Comprehensive assessment across 7 quality dimensions</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold" style={{ color: getScoreColor(optimizer.analysisReport?.overall_score ?? 0) }}>
                    {optimizer.analysisReport?.overall_score ?? '—'}
                    <span className="text-lg text-muted">/10</span>
                  </div>
                  <div className="text-xs text-muted mt-1">Overall Score</div>
                </div>
              </div>
              
              {/* Score Progress Bar */}
              <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((optimizer.analysisReport?.overall_score ?? 0) / 10) * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${getScoreColor(optimizer.analysisReport?.overall_score ?? 0)}, ${getScoreColor((optimizer.analysisReport?.overall_score ?? 0) + 1)})` }}
                />
              </div>
            </div>
          </div>

          {/* Category Score Cards */}
          <div className="grid grid-cols-2 gap-3">
            {categories.map(({ key, label, icon }) => {
              const item = optimizer.analysisReport?.detailed_scores?.[key];
              if (!item) return null;
              const score = item.score ?? 0;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl"
                  style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{icon}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--fg-color)' }}>{label}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-2xl font-bold" style={{ color: getScoreColor(score) }}>{score}</div>
                    <div className="text-xs text-muted">/10</div>
                  </div>
                  <div className="mt-2 w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(score / 10) * 100}%`, background: getScoreColor(score) }} />
                  </div>
                  {item.status && (
                    <div className="mt-2 text-xs px-2 py-0.5 rounded-full inline-block" style={{ background: getScoreBg(score), color: getScoreColor(score) }}>
                      {item.status}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Detailed Findings */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid var(--card-border)` }}>
              <span>🔍</span>
              <h3 className="font-semibold" style={{ color: 'var(--fg-color)' }}>Detailed Findings</h3>
            </div>
            <div className="p-4 space-y-3 max-h-60 overflow-auto">
              {categories.map(({ key, label, icon }) => {
                const item = optimizer.analysisReport?.detailed_scores?.[key];
                if (!item || (!item.issues?.length && !item.recommendations?.length)) return null;
                return (
                  <div key={key} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid var(--card-border)` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span>{icon}</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--fg-color)' }}>{label}</span>
                    </div>
                    {Array.isArray(item.issues) && item.issues.length > 0 && (
                      <div className="mb-2">
                        <div className="text-xs text-red-400 mb-1">Issues:</div>
                        <ul className="text-xs text-muted list-disc pl-4 space-y-1">
                          {item.issues.slice(0, 3).map((issue, i) => <li key={i}>{issue}</li>)}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(item.recommendations) && item.recommendations.length > 0 && (
                      <div>
                        <div className="text-xs text-teal-400 mb-1">Recommendations:</div>
                        <ul className="text-xs text-muted list-disc pl-4 space-y-1">
                          {item.recommendations.slice(0, 3).map((rec, i) => <li key={i}>{rec}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strengths & Action Plan */}
          <div className="grid grid-cols-2 gap-4">
            {Array.isArray(optimizer.analysisReport?.strengths) && optimizer.analysisReport.strengths.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid var(--card-border)`, background: 'rgba(16, 185, 129, 0.1)' }}>
                  <span>💪</span>
                  <h3 className="font-semibold text-emerald-400">Strengths</h3>
                </div>
                <div className="p-4">
                  <ul className="space-y-2">
                    {optimizer.analysisReport.strengths.slice(0, 5).map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-emerald-400 mt-0.5">✓</span>
                        <span style={{ color: 'var(--fg-color)' }}>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {Array.isArray(optimizer.analysisReport?.action_plan) && optimizer.analysisReport.action_plan.length > 0 && (
              <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid var(--card-border)`, background: 'rgba(20, 184, 166, 0.1)' }}>
                  <span>🎯</span>
                  <h3 className="font-semibold text-teal-400">Action Plan</h3>
                </div>
                <div className="p-4">
                  <ol className="space-y-2">
                    {optimizer.analysisReport.action_plan.slice(0, 5).map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(20, 184, 166, 0.2)', color: '#14b8a6' }}>{i + 1}</span>
                        <span style={{ color: 'var(--fg-color)' }}>{action}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* Top Issues */}
          {Array.isArray(optimizer.analysisReport?.top_issues) && optimizer.analysisReport.top_issues.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(249, 115, 22, 0.1) 100%)', border: `1px solid rgba(239, 68, 68, 0.3)` }}>
              <div className="px-4 py-3 flex items-center gap-2">
                <span>⚠️</span>
                <h3 className="font-semibold text-orange-400">Priority Issues</h3>
              </div>
              <div className="px-4 pb-4 space-y-2">
                {optimizer.analysisReport.top_issues.slice(0, 4).map((issue, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    <span className="text-red-400">●</span>
                    <span className="text-sm" style={{ color: 'var(--fg-color)' }}>{issue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl p-6" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
          <div className="text-sm text-muted mb-4">Raw Analysis Output:</div>
          <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-96" style={{ color: 'var(--fg-color)' }}>
            {optimizer.outExplanation || optimizer.optimizedCode}
          </pre>
        </div>
      )}
    </div>
  );

  return (
    <FeaturePageLayout
      title="Code Analysis"
      subtitle="Get a comprehensive quality assessment with scores across 7 key dimensions"
      icon="📊"
      accentColor="teal"
      actionLabel="Analyze Code"
      actionIcon="🔍"
      resultsSection={resultsSection}
      showFileExplorer={true}
      files={optimizer.files}
      activeFileId={optimizer.activeFileId}
      explorerCollapsed={optimizer.explorerCollapsed}
      onFileSelect={optimizer.selectFile}
      onFileCreate={optimizer.createFile}
      onFileImport={optimizer.importFile}
      onFileDelete={optimizer.deleteFile}
      onFileRename={optimizer.renameFile}
      onToggleExplorerCollapse={optimizer.toggleExplorerCollapse}
      {...optimizer}
    />
  );
};

export default AnalysisPage;
