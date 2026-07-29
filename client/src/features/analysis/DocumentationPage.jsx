import React from 'react';
import { motion } from 'framer-motion';
import FeaturePageLayout from '@/components/layout/FeaturePageLayout';
import useOptimizer from '@/features/optimization/useOptimizer';

const DocumentationPage = () => {
  const optimizer = useOptimizer({ defaultTask: 'documentation', enableFileManager: true });
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
            <div className="text-6xl mb-4">ðŸ“š</div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--fg-color)' }}>Ready to Document</h3>
            <p className="text-sm text-muted">Enter your code to auto-generate comprehensive documentation</p>
          </div>
        </div>
      ) : optimizer.docReport ? (
        <div className="space-y-4">
          {/* Documentation Header */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)', border: `1px solid var(--card-border)` }}>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: 'var(--fg-color)' }}>ðŸ“š Generated Documentation</h2>
                  <p className="text-sm text-muted mt-1">Auto-generated documentation for your code</p>
                </div>
                <button
                  onClick={() => handleCopy(optimizer.outExplanation || optimizer.optimizedCode)}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--fg-color)' }}
                >
                  {copied ? 'âœ“ Copied' : 'ðŸ“‹ Copy All'}
                </button>
              </div>
            </div>
          </div>

          {/* Overview */}
          {optimizer.docReport.overview && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}
            >
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid var(--card-border)` }}>
                <span>ðŸ“</span>
                <h3 className="font-semibold" style={{ color: 'var(--fg-color)' }}>Overview</h3>
              </div>
              <div className="p-4">
                <p className="text-sm leading-relaxed" style={{ color: 'var(--fg-color)' }}>{optimizer.docReport.overview}</p>
              </div>
            </motion.div>
          )}

          {/* Functions */}
          {Array.isArray(optimizer.docReport.functions) && optimizer.docReport.functions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}
            >
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid var(--card-border)` }}>
                <div className="flex items-center gap-2">
                  <span>âš™ï¸</span>
                  <h3 className="font-semibold" style={{ color: 'var(--fg-color)' }}>Functions</h3>
                </div>
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(20, 184, 166, 0.2)', color: '#14b8a6' }}>
                  {optimizer.docReport.functions.length} functions
                </span>
              </div>
              <div className="p-4 space-y-4 max-h-96 overflow-auto">
                {optimizer.docReport.functions.map((fn, i) => (
                  <div key={i} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid var(--card-border)` }}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-teal-400">{fn.name}</h4>
                      {fn.returns && (
                        <span className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                          â†’ {fn.returns}
                        </span>
                      )}
                    </div>
                    {fn.signature && (
                      <pre className="text-xs font-mono p-2 rounded-lg mb-2 overflow-auto" style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--fg-color)' }}>{fn.signature}</pre>
                    )}
                    {fn.description && (
                      <p className="text-sm text-muted mb-2">{fn.description}</p>
                    )}
                    {Array.isArray(fn.parameters) && fn.parameters.length > 0 && (
                      <div className="mb-2">
                        <div className="text-xs text-muted mb-1">Parameters:</div>
                        <ul className="text-xs space-y-1 pl-4">
                          {fn.parameters.map((param, j) => (
                            <li key={j} style={{ color: 'var(--fg-color)' }}>
                              <span className="text-teal-400 font-mono">{param.name}</span>
                              {param.type && <span className="text-muted"> ({param.type})</span>}
                              {param.description && <span className="text-muted"> - {param.description}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {fn.example && (
                      <div>
                        <div className="text-xs text-muted mb-1">Example:</div>
                        <pre className="text-xs font-mono p-2 rounded-lg overflow-auto" style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--fg-color)' }}>{fn.example}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Classes */}
          {Array.isArray(optimizer.docReport.classes) && optimizer.docReport.classes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}
            >
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid var(--card-border)` }}>
                <div className="flex items-center gap-2">
                  <span>ðŸ›ï¸</span>
                  <h3 className="font-semibold" style={{ color: 'var(--fg-color)' }}>Classes</h3>
                </div>
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(20, 184, 166, 0.2)', color: '#14b8a6' }}>
                  {optimizer.docReport.classes.length} classes
                </span>
              </div>
              <div className="p-4 space-y-4 max-h-80 overflow-auto">
                {optimizer.docReport.classes.map((cls, i) => (
                  <div key={i} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid var(--card-border)` }}>
                    <h4 className="font-semibold text-teal-400 mb-2">{cls.name}</h4>
                    {cls.description && <p className="text-sm text-muted mb-2">{cls.description}</p>}
                    {Array.isArray(cls.methods) && cls.methods.length > 0 && (
                      <div>
                        <div className="text-xs text-muted mb-1">Methods:</div>
                        <ul className="text-xs space-y-1 pl-4">
                          {cls.methods.map((method, j) => (
                            <li key={j} style={{ color: 'var(--fg-color)' }}>
                              <span className="text-emerald-400 font-mono">{method.name || method}</span>
                              {method.description && <span className="text-muted"> - {method.description}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Usage Examples */}
          {optimizer.docReport.usage_examples && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}
            >
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid var(--card-border)` }}>
                <span>ðŸ’¡</span>
                <h3 className="font-semibold" style={{ color: 'var(--fg-color)' }}>Usage Examples</h3>
              </div>
              <div className="p-4">
                <pre className="text-sm font-mono whitespace-pre-wrap overflow-auto" style={{ color: 'var(--fg-color)' }}>
                  {typeof optimizer.docReport.usage_examples === 'string'
                    ? optimizer.docReport.usage_examples
                    : JSON.stringify(optimizer.docReport.usage_examples, null, 2)}
                </pre>
              </div>
            </motion.div>
          )}

          {/* Notes */}
          {optimizer.docReport.notes && (
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
                <p className="text-sm" style={{ color: 'var(--fg-color)' }}>{optimizer.docReport.notes}</p>
              </div>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="rounded-xl p-6" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted">Generated Documentation:</div>
            <button
              onClick={() => handleCopy(optimizer.outExplanation || optimizer.optimizedCode)}
              className="text-xs px-3 py-1.5 rounded-md transition-colors"
              style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)`, color: 'var(--fg-color)' }}
            >
              {copied ? 'âœ“ Copied' : 'ðŸ“‹ Copy'}
            </button>
          </div>
          <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-96" style={{ color: 'var(--fg-color)' }}>
            {optimizer.outExplanation || optimizer.optimizedCode}
          </pre>
        </div>
      )}
    </div>
  );

  return (
    <FeaturePageLayout
      title="Documentation Generator"
      subtitle="Auto-generate comprehensive documentation for your code"
      icon="ðŸ“š"
      accentColor="teal"
      actionLabel="Generate Docs"
      actionIcon="ðŸ“"
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

export default DocumentationPage;

