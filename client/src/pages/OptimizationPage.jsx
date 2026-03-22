import React from 'react';
import { motion } from 'framer-motion';
import FeaturePageLayout from '../components/FeaturePageLayout';
import useCodeOptimizer from '../hooks/useCodeOptimizer';
import CodeEditor from '../components/CodeEditor';

const focusOptions = [
  { key: 'time_complexity', label: 'Time Complexity', icon: '⏱️' },
  { key: 'space_complexity', label: 'Space Complexity', icon: '📦' },
  { key: 'code_length', label: 'Code Length', icon: '📏' },
  { key: 'readability', label: 'Readability', icon: '👁️' },
  { key: 'performance', label: 'Performance', icon: '🚀' },
  { key: 'memory', label: 'Memory', icon: '💾' },
];

const OptimizationPage = () => {
  const optimizer = useCodeOptimizer('optimization', true); // Enable file manager
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Options section with optimization focus and instructions
  const optionsSection = (
    <div className="space-y-5">
      {/* Optimization Focus */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
          <div className="w-1.5 h-4 bg-[var(--accent-cyan)] rounded-full" />
          Optimization Focus
        </h4>
        <div className="flex flex-wrap gap-2.5">
          {focusOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => optimizer.setOptimizationFocus(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 border flex items-center gap-1.5 ${
                optimizer.optimizationFocus[opt.key]
                  ? 'bg-[var(--glow-cyan)] text-[var(--accent-cyan)] border-[var(--accent-cyan)] shadow-[0_0_15px_rgba(0,245,212,0.15)]'
                  : 'bg-[var(--surface-2)] text-[var(--fg-color)] border-[var(--card-border)] hover:bg-[var(--surface-1)] hover:border-[var(--card-hover-border)]'
              }`}
            >
              <span className="text-lg opacity-80">{opt.icon}</span> 
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="w-full h-px bg-[var(--card-border)]/50" />

      {/* Custom Instructions */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
          <div className="w-1.5 h-4 bg-[var(--accent-emerald)] rounded-full" />
          Custom Directives
        </h4>
        <div className="relative group">
          <textarea
            value={optimizer.userInstructions}
            onChange={(e) => optimizer.setUserInstructions(e.target.value)}
            placeholder="E.g., 'Optimize for minimum memory usage' or 'Use modern ES6 syntax'"
            className="w-full h-24 px-4 py-3 rounded-xl text-sm resize-none bg-[var(--surface-2)] border border-[var(--card-border)] text-[var(--fg-color)] transition-all focus:outline-none focus:border-[var(--accent-cyan)] focus:ring-2 focus:ring-[var(--glow-cyan)] placeholder:text-muted/50"
          />
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs font-mono px-2 py-1 rounded bg-[var(--surface-1)] text-muted">Optional</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Results section
  const resultsSection = (
    <div className="flex flex-col gap-5 sticky top-24" style={{ minHeight: '500px' }}>
      {optimizer.isOptimizing ? (
        <div className="flex-1 glass-frame flex flex-col p-8 min-h-[500px] relative overflow-hidden shadow-2xl border-[var(--accent-cyan)]/30">
          {/* Active scanning ray element */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[var(--accent-cyan)] to-transparent opacity-90 animate-float" style={{ animationDuration: '1.5s' }} />
          
          <div className="flex items-center gap-5 mb-10 relative z-10">
            <div className="w-14 h-14 rounded-full border-2 border-[var(--accent-cyan)] border-t-transparent animate-spin flex items-center justify-center shadow-[0_0_25px_var(--glow-cyan)]">
               <div className="w-10 h-10 rounded-full border-2 border-[var(--accent-emerald)] border-b-transparent animate-spin direction-reverse" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gradient-cyber mb-1.5">Synthesizing Code...</h3>
              <p className="text-sm font-mono text-muted uppercase tracking-wider">{optimizer.progressStep || 'Executing AI Optimization Models'}</p>
            </div>
          </div>
          
          {/* Stunning Skeleton Loaders */}
          <div className="space-y-8 relative z-10 flex-1 opacity-70">
             <div className="skeleton-loader h-10 w-2/5 mb-6 rounded-lg" />
             <div className="space-y-3">
                <div className="skeleton-loader h-5 w-full rounded-md" />
                <div className="skeleton-loader h-5 w-11/12 rounded-md" />
                <div className="skeleton-loader h-5 w-4/5 rounded-md" />
                <div className="skeleton-loader h-5 w-full rounded-md" />
             </div>
             
             <div className="mt-10 space-y-3">
                <div className="skeleton-loader h-4 w-3/4 rounded-md opacity-60" />
                <div className="skeleton-loader h-4 w-2/3 rounded-md opacity-60" />
                <div className="skeleton-loader h-4 w-1/2 rounded-md opacity-60" />
             </div>
             
             <div className="mt-auto pt-8 border-t border-[var(--card-border)]">
                <div className="skeleton-loader h-32 w-full rounded-xl" />
             </div>
          </div>
        </div>
      ) : !optimizer.optimizedCode ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 w-full glass-frame flex flex-col items-center justify-center px-12 py-20 text-center min-h-[500px] relative overflow-hidden group shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--glow-cyan)] via-transparent to-[var(--glow-emerald)] opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none" />
          
          <div className="relative z-10 w-28 h-28 rounded-[2rem] bg-[var(--surface-2)] border-2 border-[var(--card-border)] shadow-[0_20px_40px_rgba(0,0,0,0.1)] flex items-center justify-center mb-8 transition-transform duration-500 group-hover:scale-110 group-hover:border-[var(--accent-cyan)]/50">
            <div className="absolute inset-0 rounded-[2rem] bg-[var(--glow-cyan)] animate-stunning-glow opacity-60" />
            <span className="text-5xl relative z-10 filter drop-shadow-[0_0_15px_rgba(0,245,212,0.8)] animate-float">✨</span>
          </div>
          
          <h3 className="text-2xl md:text-3xl font-black text-[var(--fg-color)] mb-4 tracking-tight relative z-10 drop-shadow-sm">
            Awaiting Subroutine
          </h3>
          <p className="text-muted max-w-sm leading-relaxed text-sm relative z-10 font-medium px-4">
            Inject your source code, configure optimization vectors, and initialize the neural processing engine to synthesize improvements.
          </p>
        </motion.div>
      ) : (
        <>
          {/* Optimized Code Frame */}
          <div className="glass-frame flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all">
            <div className="glass-frame-header bg-gradient-to-r from-[var(--surface-2)] to-transparent border-b border-[var(--card-border)]">
              <div className="flex items-center gap-3 text-sm font-bold text-[var(--fg-color)]">
                <span className="text-[var(--accent-emerald)] filter drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse">●</span> Optimized Code
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(optimizer.outCode)}
                  className="btn-secondary px-4 py-1.5 text-xs font-bold uppercase tracking-wider"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <div className="w-px h-5 bg-[var(--border-strong)] mx-1" />
                <button
                  onClick={() => {
                    if (optimizer.backendHealthy === false) {
                      optimizer.setToast({ type: 'error', message: '⚠️ Backend server is not running.' });
                      setTimeout(() => optimizer.setToast(null), 3000);
                      return;
                    }
                    optimizer.handleRunCode();
                  }}
                  disabled={optimizer.isRunning}
                  className="px-4 py-1.5 flex items-center gap-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[var(--surface-1)] border border-[var(--accent-emerald)]/30 hover:bg-[#10b981]/20 text-[#10b981] hover:border-[#10b981]/60 transition-all disabled:opacity-50"
                  style={{ textShadow: '0 0 10px rgba(16,185,129,0.4)' }}
                >
                  <span className={optimizer.isRunning ? 'animate-spin' : ''}>
                    {optimizer.isRunning ? '⏳' : '▶'}
                  </span>
                  Execute
                </button>
                <button
                  onClick={() => {
                    if (optimizer.backendHealthy === false) {
                      optimizer.setToast({ type: 'error', message: '⚠️ Backend server is not running.' });
                      setTimeout(() => optimizer.setToast(null), 3000);
                      return;
                    }
                    optimizer.handleComparePerformance();
                  }}
                  disabled={optimizer.isComparing || !optimizer.outCode}
                  className="px-4 py-1.5 flex items-center gap-2 rounded-lg text-xs font-bold uppercase tracking-wider bg-[var(--surface-1)] border border-[#3b82f6]/30 hover:bg-[#3b82f6]/20 text-[#3b82f6] hover:border-[#3b82f6]/60 transition-all disabled:opacity-50"
                  style={{ textShadow: '0 0 10px rgba(59,130,246,0.4)' }}
                >
                  <span className={optimizer.isComparing ? 'animate-spin' : ''}>
                    {optimizer.isComparing ? '⏳' : '⟷'}
                  </span>
                  Compare Performance
                </button>
              </div>
            </div>
            <div className="h-[300px] relative bg-[var(--code-bg)]">
              <CodeEditor
                value={optimizer.outCode || '// No code output'}
                language={optimizer.resolvedEditorLanguage?.toLowerCase() || 'javascript'}
                readOnly
              />
            </div>
          </div>

          {/* Performance Comparison */}
          {optimizer.runCompare && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="glass-frame shadow-[0_15px_50px_rgba(59,130,246,0.3)] mt-2 border-t border-[var(--card-hover-border)] relative overflow-hidden group"
            >
              {/* Stunning floating glow background */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-teal-500/5 to-transparent animate-stunning-glow opacity-30 pointer-events-none" />
              
              <div className="glass-frame-header bg-[var(--surface-2)]">
                <span className="text-sm font-bold text-[var(--accent-cyan)] flex items-center gap-2">
                  <span className="text-xl filter drop-shadow-[0_0_10px_var(--accent-cyan)]">📊</span> Performance Matrix
                </span>
              </div>
              <div className="p-5 relative z-10">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { 
                      icon: '⏱️', title: 'Time Complexity', 
                      val1: optimizer.quickMetrics?.timeComplexityBefore || 'O(n)', 
                      val2: optimizer.quickMetrics?.timeComplexityAfter || 'O(1)',
                      extra: `${optimizer.quickMetrics?.originalLines ?? 0} → ${optimizer.quickMetrics?.optimizedLines ?? 0} Lines`
                    },
                    { 
                      icon: '📦', title: 'Space Complexity', 
                      val1: optimizer.quickMetrics?.spaceComplexityBefore || 'O(n)', 
                      val2: optimizer.quickMetrics?.spaceComplexityAfter || 'O(1)',
                      extra: `${optimizer.quickMetrics?.originalChars ?? 0} → ${optimizer.quickMetrics?.optimizedChars ?? 0} Chars`
                    },
                    { 
                      icon: '📏', title: 'Lines of Code', 
                      val1: `${optimizer.quickMetrics?.originalLines ?? 0}`, 
                      val2: `${optimizer.quickMetrics?.optimizedLines ?? 0}`,
                      diff: optimizer.quickMetrics?.lineReductionPct
                    },
                    { 
                      icon: '🗜️', title: 'Code Size (Bytes)', 
                      val1: `${optimizer.quickMetrics?.originalChars ?? 0} B`, 
                      val2: `${optimizer.quickMetrics?.optimizedChars ?? 0} B`,
                      diff: optimizer.quickMetrics?.charReductionPct
                    },
                    { 
                      icon: '🚀', title: 'Execution Time', 
                      val1: `${optimizer.runCompare?.original?.exec_time_ms ?? 0}ms`, 
                      val2: `${optimizer.runCompare?.optimized?.exec_time_ms ?? 0}ms`,
                      diff: optimizer.runCompare?.improvements?.speed_improvement_pct
                    },
                    { 
                      icon: '💾', title: 'Memory Usage', 
                      val1: `${optimizer.runCompare?.original?.peak_kb ?? 0}KB`, 
                      val2: `${optimizer.runCompare?.optimized?.peak_kb ?? 0}KB`,
                      diff: optimizer.runCompare?.improvements?.memory_saved_pct
                    }
                  ].map((metric, i) => (
                    <div key={i} className="bg-[var(--surface-1)] p-4 rounded-xl border border-[var(--card-border)] relative overflow-hidden shadow-inner group-hover:border-[var(--accent-cyan)]/30 transition-colors">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-muted flex items-center gap-2 mb-3">
                        <span className="text-base">{metric.icon}</span> {metric.title}
                      </div>
                      <div className="flex items-center justify-between text-base">
                        <div className="font-mono text-orange-400 font-medium">{metric.val1}</div>
                        <div className="text-muted/50 text-sm flex-shrink-0 px-2">→</div>
                        <div className="font-mono font-bold text-[var(--accent-emerald)] filter drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">{metric.val2}</div>
                      </div>
                      {/* Extra context (Lines/Chars) */}
                      {metric.extra && (
                        <div className="mt-2 text-[10px] font-mono text-muted/80 text-center border-t border-[var(--card-border)]/30 pt-2">
                           {metric.extra}
                        </div>
                      )}
                      {/* Diff Badge */}
                      {metric.diff !== undefined && metric.diff !== null && metric.diff !== 0 && (
                        <div className={`mt-3 flex items-center justify-center w-full text-xs font-black uppercase tracking-wider py-1.5 rounded-md ${metric.diff > 0 ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                          {metric.diff > 0 ? '-' : '+'}{Math.abs(metric.diff)}% Diff
                        </div>
                      )}
                      {metric.diff === 0 && (
                         <div className="mt-3 flex items-center justify-center w-full text-xs font-black uppercase tracking-wider py-1.5 rounded-md bg-gray-500/10 text-gray-400 border border-gray-500/20">
                           No Change
                         </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Explanation Banner */}
          {optimizer.outExplanation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-frame"
            >
              <div className="glass-frame-header bg-[var(--glow-cyan)] border-[var(--accent-cyan)]/30">
                <span className="text-sm font-semibold text-[var(--accent-cyan)] flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-pulse" />
                  Detailed Explanation
                </span>
              </div>
              <div className="p-4 text-sm leading-relaxed max-h-48 overflow-y-auto custom-scrollbar" style={{ color: 'var(--fg-color)' }}>
                {optimizer.outExplanation}
              </div>
            </motion.div>
          )}

          {/* Execution Console */}
          {(optimizer.runResult || optimizer.isRunning) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-frame"
            >
              <div className="glass-frame-header font-mono">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted">Terminal</span>
                  <span className="text-gray-500">/</span>
                  <span className={optimizer.runResult?.ok ? 'text-emerald-400' : 'text-red-400'}>
                    {optimizer.isRunning ? 'executing...' : (optimizer.runResult?.ok ? 'exit_0' : 'exit_1')}
                  </span>
                </div>
                {optimizer.runResult?.exec_time_ms !== undefined && (
                  <span className="text-xs text-muted font-mono bg-[#050508] px-2 py-0.5 rounded">
                    {optimizer.runResult.exec_time_ms}ms
                  </span>
                )}
              </div>
              <div className="p-4 h-32 overflow-y-auto font-mono text-xs leading-relaxed custom-scrollbar bg-[#050508] text-gray-300">
                {optimizer.isRunning ? (
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-3 bg-[var(--accent-cyan)] animate-pulse" />
                    <span className="text-muted">Executing run environment...</span>
                  </div>
                ) : (
                  <>
                    {optimizer.runResult?.stdout && (
                      <pre className="w-full whitespace-pre-wrap">{optimizer.runResult.stdout}</pre>
                    )}
                    {optimizer.runResult?.stderr && (
                      <pre className="text-red-400 w-full whitespace-pre-wrap mt-2">{optimizer.runResult.stderr}</pre>
                    )}
                    {!optimizer.runResult?.stdout && !optimizer.runResult?.stderr && (
                      <span className="text-gray-600 italic">No standard output</span>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );

  return (
    <FeaturePageLayout
      title="Code Optimization"
      subtitle="Transform your code into high-performance, efficient solutions with AI-powered analysis."
      icon="⚡"
      accentColor="cyan"
      actionLabel="Optimize Source"
      actionIcon="sparkles"
      optionsSection={optionsSection}
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

export default OptimizationPage;
