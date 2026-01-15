import React from 'react';
import { motion } from 'framer-motion';
import FeaturePageLayout from '../components/FeaturePageLayout';
import useCodeOptimizer from '../hooks/useCodeOptimizer';

const BugDetectionPage = () => {
  const optimizer = useCodeOptimizer('bug_detection', true);

  const getSeverityColor = (severity) => {
    const s = (severity || '').toLowerCase();
    if (s === 'critical') return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)' };
    if (s === 'high') return { color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.4)' };
    if (s === 'medium') return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)' };
    return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)' };
  };

  const errorCategories = [
    { key: 'compile_time_errors', label: 'Compile-Time Errors', icon: '⚙️', desc: 'Syntax and compilation issues' },
    { key: 'runtime_errors', label: 'Runtime Errors', icon: '💥', desc: 'Potential crashes and exceptions' },
    { key: 'logic_errors', label: 'Logic Errors', icon: '🧠', desc: 'Flawed reasoning and incorrect implementations' },
  ];

  const severityBadges = [
    { key: 'Critical', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)', icon: '🔴' },
    { key: 'High', color: '#f97316', bg: 'rgba(249, 115, 22, 0.2)', icon: '🟠' },
    { key: 'Medium', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)', icon: '🟡' },
    { key: 'Low', color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)', icon: '🟢' },
  ];

  // Results section
  const resultsSection = (
    <div className="space-y-4">
      {!optimizer.optimizedCode ? (
        <div className="h-full flex items-center justify-center rounded-xl p-12" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
          <div className="text-center">
            <div className="text-6xl mb-4">🐛</div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--fg-color)' }}>Ready to Scan</h3>
            <p className="text-sm text-muted">Enter your code to detect bugs and potential issues</p>
          </div>
        </div>
      ) : optimizer.bugReport ? (
        <div className="space-y-4">
          {/* Report Header */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(249, 115, 22, 0.08) 100%)', border: `1px solid var(--card-border)` }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--fg-color)' }}>🐛 Bug Scanner Report</h2>
                  <p className="text-sm text-muted mt-1">Static analysis for compile-time, runtime, and logic errors</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold" style={{ 
                    color: (optimizer.bugReport?.summary?.total ?? 0) === 0 ? '#10b981' : 
                           (optimizer.bugReport?.summary?.Critical ?? 0) > 0 ? '#ef4444' : 
                           (optimizer.bugReport?.summary?.High ?? 0) > 0 ? '#f97316' : '#f59e0b'
                  }}>
                    {optimizer.bugReport?.summary?.total ?? 0}
                  </div>
                  <div className="text-xs text-muted mt-1">Issues Found</div>
                </div>
              </div>

              {/* Severity Badges */}
              {optimizer.bugReport?.summary && (
                <div className="flex flex-wrap gap-3 mt-4">
                  {severityBadges.map(({ key, color, bg, icon }) => (
                    <motion.div
                      key={key}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-2 px-4 py-2 rounded-full"
                      style={{ background: bg, border: `1px solid ${color}40` }}
                    >
                      <span>{icon}</span>
                      <span className="text-sm font-medium" style={{ color }}>{key}</span>
                      <span className="text-lg font-bold" style={{ color }}>{optimizer.bugReport.summary[key] ?? 0}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* No Issues Found */}
          {(optimizer.bugReport?.summary?.total ?? 0) === 0 && (
            <div className="rounded-xl p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(20, 184, 166, 0.08) 100%)', border: `1px solid rgba(16, 185, 129, 0.3)` }}>
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-xl font-bold text-emerald-400 mb-2">No Issues Found!</h3>
              <p className="text-sm text-muted">Your code passed all static analysis checks. Great job!</p>
            </div>
          )}

          {/* Error Category Cards */}
          {errorCategories.map(({ key, label, icon, desc }) => {
            const items = optimizer.bugReport?.[key];
            if (!Array.isArray(items) || items.length === 0) return null;
            
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl overflow-hidden"
                style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}
              >
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid var(--card-border)`, background: 'rgba(255,255,255,0.02)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{icon}</span>
                    <div>
                      <h3 className="font-semibold" style={{ color: 'var(--fg-color)' }}>{label}</h3>
                      <p className="text-xs text-muted">{desc}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                    {items.length} {items.length === 1 ? 'issue' : 'issues'}
                  </span>
                </div>
                <div className="p-4 space-y-3 max-h-80 overflow-auto">
                  {items.slice(0, 10).map((item, idx) => {
                    const sevStyle = getSeverityColor(item.severity);
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-4 rounded-xl"
                        style={{ background: sevStyle.bg, border: `1px solid ${sevStyle.border}` }}
                      >
                        {/* Error Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: sevStyle.color, color: 'white' }}>
                              {item.severity || 'Unknown'}
                            </span>
                            <span className="text-sm font-medium" style={{ color: 'var(--fg-color)' }}>
                              {item.error_name || item.error_type || 'Issue'}
                            </span>
                          </div>
                          {item.line && (
                            <span className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--fg-color)' }}>
                              📍 Line {item.line}{item.column ? `:${item.column}` : ''}
                            </span>
                          )}
                        </div>

                        {/* Error Message */}
                        {item.message && (
                          <div className="text-sm mb-3" style={{ color: 'var(--fg-color)' }}>{item.message}</div>
                        )}

                        {/* Code Snippet */}
                        {item.code_snippet && (
                          <div className="mb-3">
                            <div className="text-xs text-muted mb-1">📝 Problematic Code:</div>
                            <pre className="themed-code font-mono text-xs whitespace-pre p-3 rounded-lg overflow-auto" style={{ background: 'rgba(0,0,0,0.3)' }}>{item.code_snippet}</pre>
                          </div>
                        )}

                        {/* Suggested Fix */}
                        {item.suggested_fix && (
                          <div className="p-3 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-emerald-400">💡</span>
                              <span className="text-xs font-medium text-emerald-400">Suggested Fix:</span>
                            </div>
                            <div className="text-sm" style={{ color: 'var(--fg-color)' }}>{item.suggested_fix}</div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}

          {/* Top Priorities */}
          {Array.isArray(optimizer.bugReport?.top_priorities) && optimizer.bugReport.top_priorities.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(249, 115, 22, 0.08) 100%)', border: `1px solid rgba(239, 68, 68, 0.3)` }}>
              <div className="px-4 py-3 flex items-center gap-2">
                <span>🎯</span>
                <h3 className="font-semibold text-orange-400">Top Priority Fixes</h3>
              </div>
              <div className="p-4 space-y-2">
                {optimizer.bugReport.top_priorities.slice(0, 5).map((priority, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(249, 115, 22, 0.3)', color: '#f97316' }}>{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded" style={{ background: priority.severity === 'Critical' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(249, 115, 22, 0.3)', color: priority.severity === 'Critical' ? '#ef4444' : '#f97316' }}>
                          {priority.severity}
                        </span>
                        {priority.line && <span className="text-xs text-muted">Line {priority.line}</span>}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--fg-color)' }}>{priority.message}</div>
                      {priority.suggested_fix && (
                        <div className="text-xs text-emerald-400 mt-1">💡 {priority.suggested_fix}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl p-6" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
          <div className="text-sm text-muted mb-4">Raw Bug Report:</div>
          <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-96" style={{ color: 'var(--fg-color)' }}>
            {optimizer.outExplanation || optimizer.optimizedCode}
          </pre>
        </div>
      )}
    </div>
  );

  return (
    <FeaturePageLayout
      title="Bug Detection"
      subtitle="Advanced static analysis to find compile-time, runtime, and logic errors"
      icon="🐛"
      accentColor="red"
      actionLabel="Scan for Bugs"
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

export default BugDetectionPage;
