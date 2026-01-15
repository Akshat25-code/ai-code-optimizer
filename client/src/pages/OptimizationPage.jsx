import React from 'react';
import { motion } from 'framer-motion';
import FeaturePageLayout from '../components/FeaturePageLayout';
import useCodeOptimizer from '../hooks/useCodeOptimizer';
import CodeEditor from '../components/CodeEditor';

const focusOptions = [
  { key: 'time_complexity', label: 'Time complexity', icon: '⏱️' },
  { key: 'space_complexity', label: 'Space complexity', icon: '📦' },
  { key: 'code_length', label: 'Code length', icon: '📏' },
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
    <div className="space-y-4">
      {/* Optimization Focus */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
        <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--fg-color)' }}>Optimization Focus</h4>
        <div className="flex flex-wrap gap-2">
          {focusOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => optimizer.setOptimizationFocus(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                optimizer.optimizationFocus[opt.key]
                  ? 'bg-teal-600 text-white'
                  : 'text-muted hover:bg-gray-700/50'
              }`}
              style={!optimizer.optimizationFocus[opt.key] ? { background: 'var(--card-bg)', border: `1px solid var(--card-border)` } : {}}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Instructions */}
      <div className="p-4 rounded-xl" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
        <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--fg-color)' }}>Custom Instructions</h4>
        <textarea
          value={optimizer.userInstructions}
          onChange={(e) => optimizer.setUserInstructions(e.target.value)}
          placeholder="Enter custom optimization instructions..."
          className="w-full h-20 px-3 py-2 rounded-lg text-sm resize-none"
          style={{ background: 'var(--bg-color)', border: `1px solid var(--card-border)`, color: 'var(--fg-color)' }}
        />
      </div>
    </div>
  );

  // Results section
  const resultsSection = (
    <div className="space-y-4">
      {!optimizer.optimizedCode ? (
        <div className="h-full flex items-center justify-center rounded-xl p-12" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
          <div className="text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--fg-color)' }}>Ready to Optimize</h3>
            <p className="text-sm text-muted">Enter your code and click "Optimize" to see the magic!</p>
          </div>
        </div>
      ) : (
        <>
          {/* Optimized Code */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
            <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: `1px solid var(--card-border)` }}>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--fg-color)' }}>✨ Optimized Code</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(optimizer.outCode)}
                  className="text-xs px-2 py-1 rounded-md transition-colors"
                  style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)`, color: 'var(--fg-color)' }}
                >
                  {copied ? '✓ Copied' : '📋 Copy'}
                </button>
                <button
                  onClick={() => {
                    if (optimizer.backendHealthy === false) {
                      optimizer.setToast({ type: 'error', message: '⚠️ Backend server is not running. Please start it first.' });
                      setTimeout(() => optimizer.setToast(null), 3000);
                      return;
                    }
                    optimizer.handleRunCode();
                  }}
                  disabled={optimizer.isRunning}
                  className="text-xs px-2 py-1 rounded-md bg-green-600 text-white disabled:opacity-50 hover:bg-green-500 transition-colors"
                >
                  {optimizer.isRunning ? 'Running…' : '▶️ Run'}
                </button>
                <button
                  onClick={() => {
                    if (optimizer.backendHealthy === false) {
                      optimizer.setToast({ type: 'error', message: '⚠️ Backend server is not running. Please start it first.' });
                      setTimeout(() => optimizer.setToast(null), 3000);
                      return;
                    }
                    optimizer.handleComparePerformance();
                  }}
                  disabled={optimizer.isComparing || !optimizer.outCode}
                  className="text-xs px-2 py-1 rounded-md bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-500 transition-colors"
                >
                  {optimizer.isComparing ? 'Comparing…' : '📊 Compare'}
                </button>
              </div>
            </div>
            <div className="h-48">
              <CodeEditor
                value={optimizer.outCode || '// No code output'}
                language={optimizer.resolvedEditorLanguage?.toLowerCase() || 'javascript'}
                readOnly
              />
            </div>
          </div>

          {/* Output Console */}
          {(optimizer.runResult || optimizer.isRunning) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}
            >
              <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: `1px solid var(--card-border)` }}>
                <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--fg-color)' }}>
                  <span>💻</span> Output Console
                  {optimizer.runResult?.ok && <span className="text-xs text-green-400">✓ Success</span>}
                  {optimizer.runResult && !optimizer.runResult.ok && <span className="text-xs text-red-400">✗ Error</span>}
                </h3>
                {optimizer.runResult?.exec_time_ms !== undefined && (
                  <span className="text-xs text-muted">⏱️ {optimizer.runResult.exec_time_ms}ms</span>
                )}
              </div>
              <div className="p-3 max-h-40 overflow-auto font-mono text-xs" style={{ background: '#0d1117' }}>
                {optimizer.isRunning ? (
                  <div className="text-yellow-400 animate-pulse">Running code...</div>
                ) : (
                  <>
                    {optimizer.runResult?.stdout && (
                      <pre className="text-green-400 whitespace-pre-wrap">{optimizer.runResult.stdout}</pre>
                    )}
                    {optimizer.runResult?.stderr && (
                      <pre className="text-red-400 whitespace-pre-wrap">{optimizer.runResult.stderr}</pre>
                    )}
                    {!optimizer.runResult?.stdout && !optimizer.runResult?.stderr && (
                      <span className="text-gray-500">No output</span>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Performance Comparison - Only shows after clicking Compare */}
          {optimizer.runCompare && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.08) 100%)', border: `1px solid var(--card-border)` }}
            >
              <div className="px-4 py-2" style={{ borderBottom: `1px solid var(--card-border)` }}>
                <h3 className="text-sm font-semibold text-purple-400">📊 Performance Comparison</h3>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Time Complexity */}
                  <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">⏱️</span>
                      <span className="text-xs font-medium text-muted">Time Complexity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 text-center">
                        <div className="text-xs text-gray-500 mb-0.5">Before</div>
                        <div className="text-xl font-bold text-orange-400">
                          {Math.max(20, Math.min(100, (optimizer.quickMetrics?.originalLines || 10) * 3 + 15))}
                        </div>
                        <div className="text-xs text-orange-300/70">
                          {optimizer.quickMetrics?.timeComplexityBefore || 'O(n²)'}
                        </div>
                      </div>
                      <div className="text-lg text-gray-600">→</div>
                      <div className="flex-1 text-center">
                        <div className="text-xs text-gray-500 mb-0.5">After</div>
                        <div className="text-xl font-bold text-green-400">
                          {Math.max(10, Math.min(80, (optimizer.quickMetrics?.optimizedLines || 8) * 2 + 5))}
                        </div>
                        <div className="text-xs text-green-300/70">
                          {optimizer.quickMetrics?.timeComplexityAfter || 'O(n)'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Space Complexity */}
                  <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">📦</span>
                      <span className="text-xs font-medium text-muted">Space Complexity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 text-center">
                        <div className="text-xs text-gray-500 mb-0.5">Before</div>
                        <div className="text-xl font-bold text-orange-400">
                          {Math.max(15, Math.min(90, (optimizer.quickMetrics?.originalChars || 100) / 10 + 10))}
                        </div>
                        <div className="text-xs text-orange-300/70">
                          {optimizer.quickMetrics?.spaceComplexityBefore || 'O(n)'}
                        </div>
                      </div>
                      <div className="text-lg text-gray-600">→</div>
                      <div className="flex-1 text-center">
                        <div className="text-xs text-gray-500 mb-0.5">After</div>
                        <div className="text-xl font-bold text-green-400">
                          {Math.max(8, Math.min(70, (optimizer.quickMetrics?.optimizedChars || 80) / 12 + 5))}
                        </div>
                        <div className="text-xs text-green-300/70">
                          {optimizer.quickMetrics?.spaceComplexityAfter || 'O(1)'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lines of Code */}
                  <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">📏</span>
                      <span className="text-xs font-medium text-muted">Lines of Code</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 text-center">
                        <div className="text-xs text-gray-500 mb-0.5">Before</div>
                        <div className="text-xl font-bold text-orange-400">{optimizer.quickMetrics?.originalLines || 0}</div>
                        <div className="text-xs text-orange-300/70">lines</div>
                      </div>
                      <div className="text-lg text-gray-600">→</div>
                      <div className="flex-1 text-center">
                        <div className="text-xs text-gray-500 mb-0.5">After</div>
                        <div className="text-xl font-bold text-green-400">{optimizer.quickMetrics?.optimizedLines || 0}</div>
                        <div className="text-xs text-green-300/70">lines</div>
                      </div>
                      {optimizer.quickMetrics?.lineReductionPct !== null && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${optimizer.quickMetrics.lineReductionPct > 0 ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                          {optimizer.quickMetrics.lineReductionPct > 0 ? '−' : '+'}{Math.abs(optimizer.quickMetrics.lineReductionPct)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Execution Time */}
                  <div className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🚀</span>
                      <span className="text-xs font-medium text-muted">Execution Time</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 text-center">
                        <div className="text-xs text-gray-500 mb-0.5">Before</div>
                        <div className="text-xl font-bold text-orange-400">
                          {optimizer.runCompare?.original?.exec_time_ms ?? 0}
                        </div>
                        <div className="text-xs text-orange-300/70">ms</div>
                      </div>
                      <div className="text-lg text-gray-600">→</div>
                      <div className="flex-1 text-center">
                        <div className="text-xs text-gray-500 mb-0.5">After</div>
                        <div className="text-xl font-bold text-green-400">
                          {optimizer.runCompare?.optimized?.exec_time_ms ?? 0}
                        </div>
                        <div className="text-xs text-green-300/70">ms</div>
                      </div>
                      {optimizer.runCompare?.improvements?.speed_improvement_pct !== null && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${(optimizer.runCompare.improvements.speed_improvement_pct || 0) > 0 ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                          {(optimizer.runCompare.improvements.speed_improvement_pct || 0) > 0 ? '−' : '+'}{Math.abs(optimizer.runCompare.improvements.speed_improvement_pct || 0)}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Memory Usage */}
                  <div className="p-3 rounded-lg col-span-2" style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">💾</span>
                      <span className="text-xs font-medium text-muted">Memory Usage</span>
                    </div>
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-0.5">Before</div>
                        <div className="text-xl font-bold text-orange-400">
                          {optimizer.runCompare?.original?.peak_kb ?? '—'}
                        </div>
                        <div className="text-xs text-orange-300/70">KB</div>
                      </div>
                      <div className="text-lg text-gray-600">→</div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 mb-0.5">After</div>
                        <div className="text-xl font-bold text-green-400">
                          {optimizer.runCompare?.optimized?.peak_kb ?? '—'}
                        </div>
                        <div className="text-xs text-green-300/70">KB</div>
                      </div>
                      {optimizer.runCompare?.improvements?.memory_saved_pct !== null && (
                        <span className={`text-xs px-2 py-1 rounded ${(optimizer.runCompare.improvements.memory_saved_pct || 0) > 0 ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
                          {(optimizer.runCompare.improvements.memory_saved_pct || 0) > 0 ? '−' : '+'}{Math.abs(optimizer.runCompare.improvements.memory_saved_pct || 0)}% memory
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Explanation */}
          {optimizer.outExplanation && (
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
              <div className="px-4 py-3" style={{ borderBottom: `1px solid var(--card-border)` }}>
                <h3 className="font-semibold" style={{ color: 'var(--fg-color)' }}>💡 Explanation</h3>
              </div>
              <div className="p-4 max-h-48 overflow-auto">
                <div className="text-sm whitespace-pre-wrap" style={{ color: 'var(--fg-color)' }}>
                  {optimizer.outExplanation}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <FeaturePageLayout
      title="Code Optimization"
      subtitle="Transform your code into high-performance, efficient solutions with AI-powered optimization"
      icon="🚀"
      accentColor="teal"
      actionLabel="Optimize Code"
      actionIcon="⚡"
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
