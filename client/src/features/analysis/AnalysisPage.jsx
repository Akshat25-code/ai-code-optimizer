import React from 'react';
import { motion } from 'framer-motion';
import FeaturePageLayout from '@/components/layout/FeaturePageLayout';
import useOptimizer from '@/features/optimization/useOptimizer';

const AnalysisPage = () => {
  const optimizer = useOptimizer({ defaultTask: 'analysis', enableFileManager: true });

  const toDisplayText = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value.map((v) => toDisplayText(v)).filter(Boolean).join(', ');
    }
    if (typeof value === 'object') {
      const severityKeys = ['Critical', 'High', 'Medium', 'Low', 'total'];
      const hasSeveritySummary = severityKeys.some((k) => Object.prototype.hasOwnProperty.call(value, k));
      if (hasSeveritySummary) {
        return severityKeys
          .filter((k) => value[k] !== null && value[k] !== undefined)
          .map((k) => `${k}: ${value[k]}`)
          .join(' | ');
      }

      const entries = Object.entries(value)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .slice(0, 4)
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);

      return entries.length ? entries.join(' | ') : JSON.stringify(value);
    }
    return '';
  };

  const getScoreColor = (score) => {
    if (score >= 8) return '#10b981'; // Emerald
    if (score >= 6) return '#f59e0b'; // Amber
    if (score >= 4) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const getScoreGradient = (score) => {
    if (score >= 8) return 'linear-gradient(90deg, #10b981, #34d399)';
    if (score >= 6) return 'linear-gradient(90deg, #f59e0b, #fbbf24)';
    if (score >= 4) return 'linear-gradient(90deg, #f97316, #fb923c)';
    return 'linear-gradient(90deg, #ef4444, #f87171)';
  };

  const getScoreBg = (score) => {
    if (score >= 8) return 'rgba(16, 185, 129, 0.15)';
    if (score >= 6) return 'rgba(245, 158, 11, 0.15)';
    if (score >= 4) return 'rgba(249, 115, 22, 0.15)';
    return 'rgba(239, 68, 68, 0.15)';
  };

  const categories = [
    { key: 'code_structure', label: 'Architecture', icon: 'ðŸ—ï¸', desc: 'Structural integrity & design' },
    { key: 'performance', label: 'Performance', icon: 'âš¡', desc: 'Efficiency & speed limits' },
    { key: 'security', label: 'Security Context', icon: 'ðŸ”’', desc: 'Vulnerability assessment' },
    { key: 'maintainability', label: 'Maintainability', icon: 'ðŸ”§', desc: 'Ease of future updates' },
    { key: 'readability', label: 'Legibility', icon: 'ðŸ“–', desc: 'Clarity and comprehension' },
    { key: 'best_practices', label: 'Standards', icon: 'âœ¨', desc: 'Adherence to paradigms' },
    { key: 'complexity', label: 'Complexity Index', icon: 'ðŸ§©', desc: 'Cognitive load & cyclomatic state' },
  ];

  // Results section with professional report card
  const resultsSection = (
    <div className="flex flex-col h-full gap-5">
      {!optimizer.optimizedCode ? (
        <div className="flex-1 glass-frame flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
          <div className="w-20 h-20 rounded-2xl bg-[var(--surface-2)] border border-[var(--card-border)] shadow-inner flex items-center justify-center mb-6 relative">
            <div className="absolute inset-0 rounded-2xl bg-[var(--glow-cyan)] animate-pulse-glow" />
            <span className="text-4xl relative z-10">ðŸ“Š</span>
          </div>
          <h3 className="text-xl font-bold text-[var(--fg-color)] mb-2">Initialize Analysis Array</h3>
          <p className="text-muted max-w-sm leading-relaxed">
            Provide your source code to generate a multidimensional quality assessment matrix.
          </p>
        </div>
      ) : optimizer.analysisReport ? (
        <div className="space-y-5">
          {/* Main Score Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="glass-frame relative overflow-hidden"
            style={{
              borderImage: `linear-gradient(135deg, ${getScoreColor(optimizer.analysisReport?.overall_score ?? 0)}80, transparent) 1`
            }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />

            <div className="p-6 relative z-10">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold text-[var(--fg-color)] tracking-tight">System Analysis Matrix</h2>
                  <p className="text-sm text-muted mt-1 font-medium">Multidimensional evaluation across 7 core metrics</p>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-6xl font-black font-mono tracking-tighter" style={{ color: getScoreColor(optimizer.analysisReport?.overall_score ?? 0) }}>
                      {optimizer.analysisReport?.overall_score ?? 'â€”'}
                    </span>
                    <span className="text-xl text-muted font-bold">/10</span>
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted mt-2 font-bold">Composite Score</div>
                </div>
              </div>

              {/* Score Progress Bar */}
              <div className="w-full h-2 rounded-full overflow-hidden bg-[var(--surface-2)] border border-[var(--card-border)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((optimizer.analysisReport?.overall_score ?? 0) / 10) * 100}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: getScoreGradient(optimizer.analysisReport?.overall_score ?? 0) }}
                />
              </div>
            </div>
          </motion.div>

          {/* Sub-scores Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map(({ key, label, icon, desc }, i) => {
              const item = optimizer.analysisReport?.detailed_scores?.[key];
              if (!item) return null;
              const score = Number(item.score ?? 0) || 0;
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-frame flex flex-col justify-between"
                  style={{
                    background: 'var(--surface-1)',
                    borderColor: 'var(--card-border)',
                  }}
                >
                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--card-border)] flex items-center justify-center text-lg shadow-sm">
                        {icon}
                      </div>
                      <div className="text-xl font-bold font-mono" style={{ color: getScoreColor(score) }}>
                        {score}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--fg-color)] tracking-tight mb-0.5">{label}</h4>
                      <p className="text-[10px] text-muted font-medium line-clamp-1">{desc}</p>
                    </div>
                  </div>
                  {/* Status Footer */}
                  {item.status && (
                    <div className="px-4 py-2 border-t border-[var(--card-border)] bg-[#050508]/50">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-center" style={{ color: getScoreColor(score) }}>
                        {toDisplayText(item.status)}
                      </div>
                    </div>
                  )}
                  {/* Bottom Line Indicator */}
                  <div className="h-0.5 w-full" style={{ background: getScoreColor(score) }} />
                </motion.div>
              );
            })}
          </div>

          {/* Actionable Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Strengths */}
            {Array.isArray(optimizer.analysisReport?.strengths) && optimizer.analysisReport.strengths.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                className="glass-frame relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                <div className="glass-frame-header bg-emerald-500/5">
                  <span className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <span className="text-lg">ðŸ’ª</span> Core Strengths
                  </span>
                </div>
                <div className="p-5">
                  <ul className="space-y-3">
                    {optimizer.analysisReport.strengths.slice(0, 4).map((s, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded flex-shrink-0 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mt-0.5">
                          <span className="text-emerald-400 text-[10px] font-bold">âœ“</span>
                        </div>
                        <span className="text-sm text-gray-300 leading-relaxed font-medium">{toDisplayText(s)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            {/* Top Issues */}
            {Array.isArray(optimizer.analysisReport?.top_issues) && optimizer.analysisReport.top_issues.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="glass-frame relative overflow-hidden"
              >
                 <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                 <div className="glass-frame-header bg-orange-500/5">
                  <span className="text-sm font-bold text-orange-400 flex items-center gap-2">
                    <span className="text-lg">âš ï¸</span> Critical Vulnerabilities
                  </span>
                </div>
                <div className="p-5">
                  <ul className="space-y-3">
                    {optimizer.analysisReport.top_issues.slice(0, 4).map((issue, i) => (
                      <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[var(--surface-1)] border border-[var(--card-border)]">
                        <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                        <span className="text-sm text-[var(--fg-color)] leading-relaxed font-medium">{toDisplayText(issue)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            {/* Action Plan (Spans Full Width) */}
            {Array.isArray(optimizer.analysisReport?.action_plan) && optimizer.analysisReport.action_plan.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="glass-frame lg:col-span-2 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-[var(--accent-cyan)]" />
                <div className="glass-frame-header bg-[var(--glow-cyan)] border-b border-[var(--card-border)]">
                  <span className="text-sm font-bold text-[var(--accent-cyan)] flex items-center gap-2">
                    <span className="text-lg">ðŸŽ¯</span> Recommended Remediation Strategy
                  </span>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {optimizer.analysisReport.action_plan.map((action, i) => (
                      <div key={i} className="flex items-start gap-3 p-4 rounded-xl relative overflow-hidden group hover:bg-[var(--surface-2)] transition-colors border border-[var(--card-border)]">
                         {/* Subtle bg hover */}
                         <div className="absolute inset-0 bg-gradient-to-r from-[var(--glow-cyan)] to-transparent opacity-0 group-hover:opacity-10 transition-opacity" />

                        <div className="flex-shrink-0 w-7 h-7 rounded bg-[var(--surface-2)] border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] flex items-center justify-center text-xs font-black shadow-[0_0_10px_rgba(0,245,212,0.1)]">
                          {i + 1}
                        </div>
                        <span className="text-sm text-gray-300 font-medium leading-relaxed relative z-10">{toDisplayText(action)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Deep Dive Modal / Section */}
          <motion.div
             initial={{ opacity: 0 }} animate={{ opacity: 1 }}
             className="glass-frame"
          >
            <div className="p-4 border-b border-[var(--card-border)] flex flex-wrap items-center justify-between gap-4">
               <div className="flex items-center gap-2">
                 <span className="text-xl">ðŸ”¬</span>
                 <h3 className="font-bold text-[var(--fg-color)]">Granular Metrics Log</h3>
               </div>
               <span className="text-xs text-muted font-mono">{categories.length} categories scanned</span>
            </div>

            <div className="p-0">
               {categories.map(({ key, label, icon }) => {
                 const item = optimizer.analysisReport?.detailed_scores?.[key];
                 if (!item || (!item.issues?.length && !item.recommendations?.length)) return null;

                 return (
                   <div key={key} className="p-5 border-b border-[var(--card-border)] last:border-0 hover:bg-[#050508]/50 transition-colors">
                     <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-3">
                         <span className="text-xl">{icon}</span>
                         <h4 className="font-bold text-[var(--fg-color)]">{label} Payload</h4>
                       </div>
                       {item.score !== undefined && (
                          <div className="text-sm font-mono font-bold px-3 py-1 bg-[var(--surface-2)] rounded-md border border-[var(--card-border)]" style={{ color: getScoreColor(item.score) }}>
                            {item.score}/10
                          </div>
                       )}
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {Array.isArray(item.issues) && item.issues.length > 0 && (
                         <div className="bg-[#1f1012]/30 p-4 rounded-xl border border-red-500/10">
                           <h5 className="text-[10px] uppercase font-bold text-red-400 mb-3 tracking-wider flex items-center gap-1.5">
                             <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Detected Flags
                           </h5>
                           <ul className="space-y-2">
                             {item.issues.map((issue, i) => (
                               <li key={i} className="text-sm text-gray-300 leading-relaxed pl-3 border-l-2 border-red-500/30">
                                 {toDisplayText(issue)}
                               </li>
                             ))}
                           </ul>
                         </div>
                       )}

                       {Array.isArray(item.recommendations) && item.recommendations.length > 0 && (
                         <div className="bg-[#0f1f1c]/30 p-4 rounded-xl border border-teal-500/10">
                           <h5 className="text-[10px] uppercase font-bold text-teal-400 mb-3 tracking-wider flex items-center gap-1.5">
                             <span className="w-1.5 h-1.5 rounded-full bg-teal-500" /> Suggestions
                           </h5>
                           <ul className="space-y-2">
                             {item.recommendations.map((rec, i) => (
                               <li key={i} className="text-sm text-gray-300 leading-relaxed pl-3 border-l-2 border-teal-500/30">
                                 {toDisplayText(rec)}
                               </li>
                             ))}
                           </ul>
                         </div>
                       )}
                     </div>
                   </div>
                 );
               })}
            </div>
          </motion.div>
        </div>
      ) : (
        <div className="glass-frame p-6">
          <div className="text-xs font-bold uppercase tracking-wider text-muted mb-4 pb-2 border-b border-[var(--card-border)]">Direct Output Feed</div>
          <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-96 font-mono text-gray-300 custom-scrollbar p-4 bg-[#050508] rounded-xl border border-[var(--card-border)]">
            {optimizer.outExplanation || optimizer.optimizedCode}
          </pre>
        </div>
      )}
    </div>
  );

  return (
    <FeaturePageLayout
      title="Code Analysis Core"
      subtitle="Examine your codebase architecture with a 7-dimensional scoring matrix."
      icon="ðŸ“ˆ"
      accentColor="cyan"
      actionLabel="Initiate Scan"
      actionIcon="radar"
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

