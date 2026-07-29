import React from 'react';
import { motion } from 'framer-motion';
import FeaturePageLayout from '@/components/layout/FeaturePageLayout';
import useOptimizer from '@/features/optimization/useOptimizer';
import CodeEditor from '@/components/editor/CodeEditor';

const RefactoringPage = () => {
  const optimizer = useOptimizer({ defaultTask: 'refactoring', enableFileManager: true });
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Results section
  const resultsSection = (
    <div className="space-y-4">
      {!optimizer.optimizedCode ? (
        <div className="h-full flex items-center justify-center rounded-xl p-12" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
          <div className="text-center">
            <div className="text-6xl mb-4">ðŸ—ï¸</div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--fg-color)' }}>Ready to Refactor</h3>
            <p className="text-sm text-muted">Enter your code to improve its structure and design</p>
          </div>
        </div>
      ) : optimizer.refactorReport ? (
        <div className="space-y-4">
          {/* Refactoring Header */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)', border: `1px solid var(--card-border)` }}>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--fg-color)' }}>ðŸ—ï¸ Refactoring Results</h2>
                  <p className="text-sm text-muted mt-1">Improved code structure and design patterns</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(optimizer.refactorReport.refactored_code || optimizer.outCode)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--fg-color)' }}
                  >
                    {copied ? 'âœ“ Copied' : 'ðŸ“‹ Copy Code'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Refactored Code */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl overflow-hidden"
            style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}
          >
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid var(--card-border)` }}>
              <div className="flex items-center gap-2">
                <span>âœ¨</span>
                <h3 className="font-semibold" style={{ color: 'var(--fg-color)' }}>Refactored Code</h3>
              </div>
            </div>
            <div className="h-64">
              <CodeEditor
                value={optimizer.refactorReport.refactored_code || optimizer.outCode || '// No code output'}
                language={optimizer.resolvedEditorLanguage?.toLowerCase() || 'javascript'}
                readOnly
              />
            </div>
          </motion.div>

          {/* Summary */}
          {optimizer.refactorReport.summary && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}
            >
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid var(--card-border)` }}>
                <span>ðŸ“‹</span>
                <h3 className="font-semibold" style={{ color: 'var(--fg-color)' }}>Summary</h3>
              </div>
              <div className="p-4">
                <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-color)' }}>{optimizer.refactorReport.summary}</p>
              </div>
            </motion.div>
          )}

          {/* Changes Made */}
          {Array.isArray(optimizer.refactorReport.changes) && optimizer.refactorReport.changes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}
            >
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid var(--card-border)` }}>
                <div className="flex items-center gap-2">
                  <span>ðŸ”„</span>
                  <h3 className="font-semibold" style={{ color: 'var(--fg-color)' }}>Changes Made</h3>
                </div>
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(20, 184, 166, 0.2)', color: '#14b8a6' }}>
                  {optimizer.refactorReport.changes.length} changes
                </span>
              </div>
              <div className="p-4 space-y-3 max-h-60 overflow-auto">
                {optimizer.refactorReport.changes.map((change, i) => (
                  <div key={i} className="p-3 rounded-lg flex items-start gap-3" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid var(--card-border)` }}>
                    <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(20, 184, 166, 0.2)', color: '#14b8a6' }}>{i + 1}</span>
                    <div className="flex-1">
                      {typeof change === 'string' ? (
                        <p className="text-sm" style={{ color: 'var(--fg-color)' }}>{change}</p>
                      ) : (
                        <>
                          <p className="text-sm font-medium" style={{ color: 'var(--fg-color)' }}>{change.description || change.type}</p>
                          {change.before && (
                            <div className="mt-2">
                              <div className="text-xs text-red-400 mb-1">Before:</div>
                              <pre className="text-xs font-mono p-2 rounded-lg overflow-auto" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>{change.before}</pre>
                            </div>
                          )}
                          {change.after && (
                            <div className="mt-2">
                              <div className="text-xs text-emerald-400 mb-1">After:</div>
                              <pre className="text-xs font-mono p-2 rounded-lg overflow-auto" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>{change.after}</pre>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Patterns Applied */}
          {Array.isArray(optimizer.refactorReport.patterns_applied) && optimizer.refactorReport.patterns_applied.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(16, 185, 129, 0.08) 100%)', border: `1px solid var(--card-border)` }}
            >
              <div className="px-4 py-3 flex items-center gap-2">
                <span>ðŸŽ¨</span>
                <h3 className="font-semibold text-teal-400">Design Patterns Applied</h3>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {optimizer.refactorReport.patterns_applied.map((pattern, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg text-sm" style={{ background: 'rgba(20, 184, 166, 0.2)', color: '#14b8a6' }}>
                      {typeof pattern === 'string' ? pattern : pattern.name || pattern.pattern}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Improvements */}
          {Array.isArray(optimizer.refactorReport.improvements) && optimizer.refactorReport.improvements.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}
            >
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid var(--card-border)`, background: 'rgba(16, 185, 129, 0.1)' }}>
                <span>ðŸ’ª</span>
                <h3 className="font-semibold text-emerald-400">Improvements</h3>
              </div>
              <div className="p-4">
                <ul className="space-y-2">
                  {optimizer.refactorReport.improvements.map((improvement, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-emerald-400 mt-0.5">âœ“</span>
                      <span style={{ color: 'var(--fg-color)' }}>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {/* Notes */}
          {optimizer.refactorReport.notes && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(251, 191, 36, 0.08) 100%)', border: `1px solid rgba(245, 158, 11, 0.3)` }}
            >
              <div className="px-4 py-3 flex items-center gap-2">
                <span>ðŸ“Œ</span>
                <h3 className="font-semibold text-amber-400">Notes</h3>
              </div>
              <div className="p-4">
                <p className="text-sm" style={{ color: 'var(--fg-color)' }}>{optimizer.refactorReport.notes}</p>
              </div>
            </motion.div>
          )}
        </div>
      ) : (
        /* Fallback for non-JSON response */
        <div className="space-y-4">
          {optimizer.outCode && (
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid var(--card-border)` }}>
                <h3 className="font-semibold" style={{ color: 'var(--fg-color)' }}>âœ¨ Refactored Code</h3>
                <button
                  onClick={() => handleCopy(optimizer.outCode)}
                  className="text-xs px-3 py-1.5 rounded-md transition-colors"
                  style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)`, color: 'var(--fg-color)' }}
                >
                  {copied ? 'âœ“ Copied' : 'ðŸ“‹ Copy'}
                </button>
              </div>
              <div className="h-64">
                <CodeEditor
                  value={optimizer.outCode}
                  language={optimizer.resolvedEditorLanguage?.toLowerCase() || 'javascript'}
                  readOnly
                />
              </div>
            </div>
          )}
          {optimizer.outExplanation && (
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
              <div className="px-4 py-3" style={{ borderBottom: `1px solid var(--card-border)` }}>
                <h3 className="font-semibold" style={{ color: 'var(--fg-color)' }}>ðŸ’¡ Explanation</h3>
              </div>
              <div className="p-4 max-h-48 overflow-auto">
                <pre className="text-sm whitespace-pre-wrap" style={{ color: 'var(--fg-color)' }}>{optimizer.outExplanation}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <FeaturePageLayout
      title="Code Refactoring"
      subtitle="Improve code structure with design patterns and best practices"
      icon="ðŸ—ï¸"
      accentColor="teal"
      actionLabel="Refactor Code"
      actionIcon="ðŸ”„"
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

export default RefactoringPage;

