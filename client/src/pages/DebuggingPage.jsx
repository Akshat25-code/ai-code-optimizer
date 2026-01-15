import React from 'react';
import { motion } from 'framer-motion';
import FeaturePageLayout from '../components/FeaturePageLayout';
import useCodeOptimizer from '../hooks/useCodeOptimizer';
import CodeEditor from '../components/CodeEditor';

const DebuggingPage = () => {
  const optimizer = useCodeOptimizer('debugging', true);
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
            <div className="text-6xl mb-4">🔧</div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--fg-color)' }}>Ready to Debug</h3>
            <p className="text-sm text-muted">Enter your buggy code to get AI-powered fixes</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Debugging Header */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(20, 184, 166, 0.1) 100%)', border: `1px solid var(--card-border)` }}>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--fg-color)' }}>🔧 Debugging Results</h2>
                  <p className="text-sm text-muted mt-1">AI-powered bug fixes and explanations</p>
                </div>
                <button
                  onClick={() => handleCopy(optimizer.outCode)}
                  disabled={!optimizer.outCode}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--fg-color)' }}
                >
                  {copied ? '✓ Copied' : '📋 Copy Fixed Code'}
                </button>
              </div>
            </div>
          </div>

          {/* Fixed Code */}
          {optimizer.outCode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}
            >
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid var(--card-border)` }}>
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  <h3 className="font-semibold" style={{ color: 'var(--fg-color)' }}>Fixed Code</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={optimizer.handleRunCode}
                    disabled={optimizer.isRunning}
                    className="text-xs px-3 py-1.5 rounded-md bg-green-600 text-white disabled:opacity-50"
                  >
                    {optimizer.isRunning ? 'Running…' : '▶️ Run'}
                  </button>
                </div>
              </div>
              <div className="h-64">
                <CodeEditor
                  value={optimizer.outCode}
                  language={optimizer.resolvedEditorLanguage?.toLowerCase() || 'javascript'}
                  readOnly
                />
              </div>
            </motion.div>
          )}

          {/* Run Result */}
          {optimizer.runResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}
            >
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid var(--card-border)` }}>
                <span>▶️</span>
                <h3 className="font-semibold" style={{ color: 'var(--fg-color)' }}>Execution Result</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted">
                  <span>⏱️ Time: {optimizer.runResult.exec_time_ms}ms</span>
                  {optimizer.runResult.peak_kb && <span>💾 Memory: {optimizer.runResult.peak_kb}KB</span>}
                </div>
                {optimizer.runResult.stdout && (
                  <div>
                    <div className="text-xs text-muted mb-1">Output:</div>
                    <pre className="text-sm font-mono p-3 rounded-lg overflow-auto max-h-32" style={{ background: 'rgba(0,0,0,0.3)', color: '#10b981' }}>
                      {optimizer.runResult.stdout}
                    </pre>
                  </div>
                )}
                {optimizer.runResult.stderr && (
                  <div>
                    <div className="text-xs text-red-400 mb-1">Errors:</div>
                    <pre className="text-sm font-mono p-3 rounded-lg overflow-auto max-h-32" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                      {optimizer.runResult.stderr}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Explanation */}
          {optimizer.outExplanation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}
            >
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid var(--card-border)` }}>
                <span>💡</span>
                <h3 className="font-semibold" style={{ color: 'var(--fg-color)' }}>Explanation</h3>
              </div>
              <div className="p-4 max-h-80 overflow-auto">
                <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--fg-color)' }}>
                  {optimizer.outExplanation}
                </div>
              </div>
            </motion.div>
          )}

          {/* Tips Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, rgba(16, 185, 129, 0.08) 100%)', border: `1px solid var(--card-border)` }}
          >
            <div className="px-4 py-3 flex items-center gap-2">
              <span>💡</span>
              <h3 className="font-semibold text-teal-400">Debugging Tips</h3>
            </div>
            <div className="p-4">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-teal-400">•</span>
                  <span style={{ color: 'var(--fg-color)' }}>Always test edge cases after fixing bugs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400">•</span>
                  <span style={{ color: 'var(--fg-color)' }}>Add error handling to prevent similar issues</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400">•</span>
                  <span style={{ color: 'var(--fg-color)' }}>Consider writing unit tests for critical code paths</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400">•</span>
                  <span style={{ color: 'var(--fg-color)' }}>Use logging to trace execution flow in complex code</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );

  return (
    <FeaturePageLayout
      title="Code Debugging"
      subtitle="AI-powered bug detection and automatic fixes"
      icon="🔧"
      accentColor="emerald"
      actionLabel="Debug Code"
      actionIcon="🐛"
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

export default DebuggingPage;
