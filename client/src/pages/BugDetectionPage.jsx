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
    { key: 'Critical', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239,68,68,0.3)', icon: '🔴' },
    { key: 'High', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249,115,22,0.3)', icon: '🟠' },
    { key: 'Medium', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245,158,11,0.3)', icon: '🟡' },
    { key: 'Low', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16,185,129,0.3)', icon: '🟢' },
  ];

  // Results section
  const resultsSection = (
    <div className="flex flex-col h-full gap-5">
      {!optimizer.optimizedCode ? (
        <div className="flex-1 glass-frame flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
          <div className="w-20 h-20 rounded-2xl bg-[var(--surface-2)] border border-[var(--card-border)] shadow-inner flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 rounded-2xl bg-[var(--glow-cyan)] animate-pulse-glow" style={{ background: 'rgba(239,68,68,0.1)' }} />
            <span className="text-4xl relative z-10">🐛</span>
          </div>
          <h3 className="text-xl font-bold text-[var(--fg-color)] mb-2">Ready to Scan</h3>
          <p className="text-muted max-w-sm leading-relaxed">
            Enter your source code and initialize the scanner to detect bugs and potential vulnerabilities.
          </p>
        </div>
      ) : optimizer.bugReport ? (
        <div className="space-y-5">
          {/* Report Header */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="glass-frame relative overflow-hidden" 
            style={{ borderImage: 'linear-gradient(135deg, rgba(239, 68, 68, 0.4), rgba(249, 115, 22, 0.1)) 1' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
            <div className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-[var(--fg-color)] tracking-tight">Advanced Scanner Report</h2>
                  <p className="text-sm text-muted mt-1">Static analysis for compile-time, runtime, and logic anomalies</p>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-black font-mono tracking-tighter" style={{ 
                    color: (optimizer.bugReport?.summary?.total ?? 0) === 0 ? '#10b981' : 
                           (optimizer.bugReport?.summary?.Critical ?? 0) > 0 ? '#ef4444' : 
                           (optimizer.bugReport?.summary?.High ?? 0) > 0 ? '#f97316' : '#f59e0b',
                    textShadow: (optimizer.bugReport?.summary?.total ?? 0) === 0 ? '0 0 20px rgba(16,185,129,0.3)' : 
                               (optimizer.bugReport?.summary?.Critical ?? 0) > 0 ? '0 0 20px rgba(239,68,68,0.3)' : 'none'
                  }}>
                    {optimizer.bugReport?.summary?.total ?? 0}
                  </div>
                  <div className="text-xs uppercase tracking-widest text-muted mt-1 font-semibold">Issues Found</div>
                </div>
              </div>

              {/* Severity Badges */}
              {optimizer.bugReport?.summary && (
                <div className="flex flex-wrap gap-3">
                  {severityBadges.map(({ key, color, bg, border, icon }) => (
                    <motion.div
                      key={key}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-2.5 px-4 py-2 rounded-xl backdrop-blur-md"
                      style={{ background: bg, border: `1px solid ${border}` }}
                    >
                      <span className="text-xs opacity-80">{icon}</span>
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>{key}</span>
                      <span className="text-base font-bold font-mono" style={{ color }}>{optimizer.bugReport.summary[key] ?? 0}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* No Issues Found */}
          {(optimizer.bugReport?.summary?.total ?? 0) === 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="glass-frame p-10 text-center relative overflow-hidden group" 
            >
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="text-5xl mb-4 animate-bounce">🎉</div>
              <h3 className="text-2xl font-bold text-emerald-400 mb-2">Clean Code!</h3>
              <p className="text-muted">The scanner found zero critical issues. Your code is looking solid.</p>
            </motion.div>
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
                className="glass-frame"
              >
                <div className="glass-frame-header bg-[var(--surface-2)] border-b border-[var(--card-border)]">
                  <div className="flex items-center gap-3">
                    <span className="text-lg opacity-80">{icon}</span>
                    <div>
                      <h3 className="font-semibold text-[var(--fg-color)]">{label}</h3>
                      <p className="text-xs text-muted font-medium">{desc}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-md text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
                    {items.length} {items.length === 1 ? 'Issue' : 'Issues'}
                  </span>
                </div>
                <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {items.map((item, idx) => {
                    const sevStyle = getSeverityColor(item.severity);
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-5 rounded-xl border relative overflow-hidden"
                        style={{ background: 'var(--surface-1)', borderColor: 'var(--card-border)' }}
                      >
                        {/* Subtle left glow based on severity */}
                        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: sevStyle.color }} />
                        
                        {/* Error Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider" style={{ background: sevStyle.bg, color: sevStyle.color, border: `1px solid ${sevStyle.border}` }}>
                              {item.severity || 'Unknown'}
                            </span>
                            <span className="text-sm font-bold text-[var(--fg-color)]">
                              {item.error_name || item.error_type || 'Issue Detected'}
                            </span>
                          </div>
                          {item.line && (
                            <span className="text-xs px-2.5 py-1 rounded-md font-mono text-muted bg-[var(--surface-2)] border border-[var(--card-border)]">
                              Line {item.line}{item.column ? `:${item.column}` : ''}
                            </span>
                          )}
                        </div>

                        {/* Error Message */}
                        {item.message && (
                          <div className="text-sm text-gray-300 leading-relaxed mb-4">{item.message}</div>
                        )}

                        {/* Code Snippet */}
                        {item.code_snippet && (
                          <div className="mb-4">
                            <pre className="font-mono text-xs whitespace-pre px-4 py-3 rounded-xl overflow-x-auto bg-[#0a0a0c] border border-[var(--card-border)] text-gray-300">
                              {item.code_snippet}
                            </pre>
                          </div>
                        )}

                        {/* Suggested Fix */}
                        {item.suggested_fix && (
                          <div className="p-4 rounded-xl border" style={{ background: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-emerald-400 opacity-80">💡</span>
                              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Resolution Strategy</span>
                            </div>
                            <div className="text-sm text-gray-300 leading-relaxed">{item.suggested_fix}</div>
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
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="glass-frame mt-4" 
              style={{ borderImage: 'linear-gradient(135deg, rgba(249, 115, 22, 0.4), rgba(239, 68, 68, 0.1)) 1' }}
            >
              <div className="glass-frame-header bg-gradient-to-r from-orange-500/10 to-transparent">
                <span className="text-sm font-semibold text-orange-400 flex items-center gap-2">
                  <span className="text-lg">🎯</span> Priority Action Items
                </span>
              </div>
              <div className="p-4 space-y-3">
                {optimizer.bugReport.top_priorities.slice(0, 5).map((priority, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--card-border)]">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black" style={{ background: 'var(--surface-2)', color: 'var(--fg-color)' }}>{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ background: priority.severity === 'Critical' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249, 115, 22, 0.15)', color: priority.severity === 'Critical' ? '#ef4444' : '#f97316', border: `1px solid ${priority.severity === 'Critical' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(249, 115, 22, 0.3)'}` }}>
                          {priority.severity}
                        </span>
                        {priority.line && <span className="text-xs font-mono text-muted bg-[var(--surface-2)] px-2 py-0.5 rounded border border-[var(--card-border)]">L{priority.line}</span>}
                      </div>
                      <div className="text-sm text-[var(--fg-color)] mb-2 font-medium">{priority.message}</div>
                      {priority.suggested_fix && (
                        <div className="text-xs text-emerald-400/90 flex items-start gap-1.5"><span className="opacity-70 mt-0.5">↳</span> {priority.suggested_fix}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="glass-frame p-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-4 pb-2 border-b border-[var(--card-border)]">Raw Output Log</div>
          <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-96 font-mono text-gray-300 custom-scrollbar p-2 bg-[#0a0a0c] rounded-lg">
            {optimizer.outExplanation || optimizer.optimizedCode}
          </pre>
        </div>
      )}
    </div>
  );

  return (
    <FeaturePageLayout
      title="Bug Detection Core"
      subtitle="Deep static analysis to preempt compile-time, runtime, and logic anomalies."
      icon="🕷️"
      accentColor="red"
      actionLabel="Initialize Scan"
      actionIcon="target"
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
