import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CodeEditor from './CodeEditor';
import { AmbientBackground, Toast, ProgressBar, ConfigPanel, CodeInputPanel, AnalyticsDashboard } from './optimizer';
import useOptimizer, { parseAiResult } from './optimizer/useOptimizer';

// Professional Code Optimizer Interface
const CodeOptimizer = () => {
  const {
    code, setCode, language, setLanguage, supportedLanguages, task, setTask,
    aiProvider, setAiProvider, compareMode, setCompareMode,
    selectedProviders, setSelectedProviders, optimizedCode, outCode, outExplanation,
    compareResults, copied, setCopied, isOptimizing, optimizationCount,
    showAuthModal, setShowAuthModal, error, setError, backendHealthy,
    professionalMode, setProfessionalMode, progressStep, toast, setToast,
    sessions, saving, runResult, isRunning, runCompare, isComparing, perfHistory,
    lastTokens, analytics, fetchAnalytics, ghModalOpen, setGhModalOpen, currentSessionId,
    userInstructions, setUserInstructions, optimizationFocus, setOptimizationFocus,
    resolvedEditorLanguage, analysisReport, bugReport, docReport, refactorReport, quickMetrics,
    user, navigate,
    handleOptimizeCode, handleCompareModels, handleSaveSession,
    handleRunCode, handleAutoFix, handleComparePerformance, handleLoadSession, handleDeleteSession,
  } = useOptimizer();

  // Sanitize AI explanation: remove emojis/markdown; leave code parsing separate
  const sanitizeProfessional = (text) => {
    if (!text) return text;
    try {
      const codeRegex = /```([a-zA-Z]*)?\n([\s\S]*?)```/g;
      const parts = [];
      let last = 0;
      let m;
      while ((m = codeRegex.exec(text)) !== null) {
        const [full, _lang, code] = m;
        const before = text.slice(last, m.index);
        if (before) parts.push({ type: 'text', value: before });
        parts.push({ type: 'code', value: code });
        last = m.index + full.length;
      }
      if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });

      const emojiRe = /([\u2700-\u27BF]|[\u2190-\u21FF]|[\u2600-\u26FF]|[\uFE00-\uFE0F]|\u24C2|[\uD83C-\uDBFF][\uDC00-\uDFFF])/g;
      const cleanText = (s) => {
        s = s.replace(emojiRe, '');
        s = s.replace(/^\s*[#>]+\s*/gm, '');
        s = s.replace(/^\s*[\-\*•]\s+/gm, '- ');
        s = s.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1');
        s = s.replace(/\*(.*?)\*/g, '$1').replace(/_(.*?)_/g, '$1');
        s = s.replace(/`{1,3}/g, '');
        s = s.replace(/^```[a-zA-Z]*\s*$/gm, '');
        s = s.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
        return s.trim();
      };

      return parts.map(p => p.type === 'code' ? p.value.replace(/[ \t]+$/gm, '').trimEnd() : cleanText(p.value)).join('\n');
    } catch {
      return text;
    }
  };

  const cleanExplanationText = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .replace(/[ \t]+$/gm, '')
      .trim();
  };

  return (
    <div className="min-h-screen relative overflow-hidden theme-hero" style={{ color: 'var(--fg-color)' }}>
      {/* Ambient Background (CSS only) */}
      <div className="absolute inset-0 z-0"><AmbientBackground /></div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.3 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Steps (while processing) */}
      <AnimatePresence>
        {progressStep && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-teal-600/90 text-white shadow-md">
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {progressStep === 'validating' && 'Validating input...'}
              {progressStep === 'connecting' && 'Connecting to AI...'}
              {progressStep === 'processing' && 'AI is thinking...'}
              {progressStep === 'rendering' && 'Rendering results...'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Main Interface */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Input Section */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >              {/* Controls */}
              <ConfigPanel
                language={language} setLanguage={setLanguage} supportedLanguages={supportedLanguages}
                resolvedEditorLanguage={resolvedEditorLanguage} task={task} setTask={setTask}
                aiProvider={aiProvider} setAiProvider={setAiProvider} compareMode={compareMode} setCompareMode={setCompareMode}
                selectedProviders={selectedProviders} setSelectedProviders={setSelectedProviders}
                userInstructions={userInstructions} setUserInstructions={setUserInstructions}
                optimizationFocus={optimizationFocus} setOptimizationFocus={setOptimizationFocus}
                setGhModalOpen={setGhModalOpen}
              />


              {/* Input Section */}
              <CodeInputPanel
                code={code} setCode={setCode} resolvedEditorLanguage={resolvedEditorLanguage}
                error={error} setError={setError} isOptimizing={isOptimizing}
                compareMode={compareMode} task={task} onSubmit={compareMode ? handleCompareModels : handleOptimizeCode}
              />

            </motion.div>

            {/* Output Section */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-6 lg:col-span-2"
            >
              <div className="p-6 rounded-2xl backdrop-blur-xl border soft-shadow tint-teal tint-outline h-full" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold">Optimized Result</h2>
                    {currentSessionId && (
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase tracking-wider animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]" />
                        Live Sync Active
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {currentSessionId && (
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(currentSessionId);
                          setToast({ type: 'success', message: 'Collaboration ID copied to clipboard!' });
                          setTimeout(() => setToast(null), 3000);
                        }}
                        className="p-2 hover:bg-white/5 rounded-xl transition text-muted group"
                        title="Copy Collaboration ID"
                      >
                        <svg className="w-4 h-4 group-hover:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      </button>
                    )}
                    {optimizedCode && (
                      <button
                        onClick={handleSaveSession}
                        disabled={!optimizedCode || saving}
                        className="px-5 py-2 rounded-xl text-xs disabled:opacity-50"
                        style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                        title={user ? '' : 'Sign in to save sessions'}
                      >
                        {saving ? 'Saving…' : 'Save Session'}
                      </button>
                    )}
                  </div>
                </div>

                {!optimizedCode && !compareResults && (
                  <div className="h-96 rounded-xl p-4 overflow-auto flex items-center justify-center text-center text-muted" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                    {isOptimizing ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full mx-auto mb-3"
                        />
                        <p className="text-teal-500">
                          {progressStep === 'validating' && 'Validating input...'}
                          {progressStep === 'connecting' && 'Connecting to AI...'}
                          {progressStep === 'processing' && 'AI is processing your request...'}
                          {progressStep === 'rendering' && 'Rendering results...'}
                          {!progressStep && 'AI is processing your request...'}
                        </p>
                      </motion.div>
                    ) : (
                      <div>
                        <div className="text-6xl mb-4 opacity-50">💡</div>
                        <p className="text-sm">Enter your code and click the button to get started</p>
                      </div>
                    )}
                  </div>
                )}

                {compareResults && (
                  <div className="space-y-4">
                    <div className="text-xs text-muted">Compared: {(compareResults.providers || []).join(', ')} • Took: {compareResults.took_ms}ms</div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(() => {
                        const order = ['openai', 'claude', 'gemini'];
                        const results = compareResults.results || {};
                        const providers = (compareResults.providers && compareResults.providers.length > 0)
                          ? compareResults.providers
                          : Object.keys(results);

                        const orderedProviders = order
                          .filter((p) => providers.includes(p))
                          .concat(providers.filter((p) => !order.includes(p)));

                        return orderedProviders
                          .filter((p) => results[p] != null)
                          .map((p) => {
                            const item = results[p];
                        const isOk = item?.status === 'ok';
                        const raw = item?.result || '';
                        const parsed = isOk ? parseAiResult(raw) : { code: '', explanation: '' };
                        return (
                          <div key={p} className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid var(--card-border)` }}>
                              <div>
                                <div className="font-semibold">{p}</div>
                                <div className="text-xs text-muted">{item?.provider_used || ''}</div>
                              </div>
                              <div className="text-xs text-muted">{item?.status}{item?.duration_ms != null ? ` • ${item.duration_ms}ms` : ''}</div>
                            </div>
                            <div className="p-4">
                              {!isOk && (
                                <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                                  <div className="text-xs text-muted mb-1">Error</div>
                                  <div className="text-red-300 whitespace-pre-wrap">{item?.error || 'Unknown error'}</div>
                                </div>
                              )}

                              {isOk && (
                                <>
                                  <div className="text-xs text-muted mb-2">Code</div>
                                  <pre className="themed-code font-mono text-sm whitespace-pre leading-relaxed max-h-48 overflow-auto">{parsed.code || raw || 'No output'}</pre>
                                  <div className="text-xs text-muted mt-3 mb-2">Explanation</div>
                                  <div className="text-sm whitespace-pre-wrap leading-relaxed max-h-40 overflow-auto" style={{ color: 'var(--fg-color)' }}>
                                    {cleanExplanationText(parsed.explanation || '')}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                          });
                      })()}
                    </div>
                  </div>
                )}

                {task === 'analytics' && (
                  <div className="mb-10">
                    <AnalyticsDashboard analytics={analytics} fetchAnalytics={fetchAnalytics} />
                  </div>
                )}

                {optimizedCode && (
                  <>
                    {task === 'analysis' && (
                      <div className="space-y-6 mb-6">
                        {/* Professional Report Card Header */}
                        <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)', border: `1px solid var(--card-border)` }}>
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h2 className="text-xl font-bold" style={{ color: 'var(--fg-color)' }}>📊 Code Analysis Report Card</h2>
                                <p className="text-sm text-muted mt-1">Comprehensive assessment across 7 quality dimensions</p>
                              </div>
                              <div className="text-right">
                                <div className="text-4xl font-bold" style={{ 
                                  color: (analysisReport?.overall_score ?? 0) >= 8 ? '#10b981' : 
                                         (analysisReport?.overall_score ?? 0) >= 6 ? '#f59e0b' : 
                                         (analysisReport?.overall_score ?? 0) >= 4 ? '#f97316' : '#ef4444'
                                }}>
                                  {analysisReport?.overall_score ?? '—'}
                                  <span className="text-lg text-muted">/10</span>
                                </div>
                                <div className="text-xs text-muted mt-1">Overall Score</div>
                              </div>
                            </div>
                            
                            {/* Score Progress Bar */}
                            <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${((analysisReport?.overall_score ?? 0) / 10) * 100}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className="h-full rounded-full"
                                style={{ 
                                  background: (analysisReport?.overall_score ?? 0) >= 8 ? 'linear-gradient(90deg, #10b981, #14b8a6)' : 
                                             (analysisReport?.overall_score ?? 0) >= 6 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 
                                             (analysisReport?.overall_score ?? 0) >= 4 ? 'linear-gradient(90deg, #f97316, #fb923c)' : 'linear-gradient(90deg, #ef4444, #f87171)'
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {analysisReport?.detailed_scores ? (
                          <>
                            {/* Category Score Cards Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {[
                                ['code_structure', 'Structure', '🏗️'],
                                ['performance', 'Performance', '⚡'],
                                ['security', 'Security', '🔒'],
                                ['maintainability', 'Maintainability', '🔧'],
                                ['readability', 'Readability', '📖'],
                                ['best_practices', 'Best Practices', '✨'],
                                ['complexity', 'Complexity', '🧩'],
                              ].map(([key, label, icon]) => {
                                const item = analysisReport.detailed_scores?.[key];
                                if (!item) return null;
                                const score = item.score ?? 0;
                                const getScoreColor = (s) => s >= 8 ? '#10b981' : s >= 6 ? '#f59e0b' : s >= 4 ? '#f97316' : '#ef4444';
                                const getScoreBg = (s) => s >= 8 ? 'rgba(16, 185, 129, 0.15)' : s >= 6 ? 'rgba(245, 158, 11, 0.15)' : s >= 4 ? 'rgba(249, 115, 22, 0.15)' : 'rgba(239, 68, 68, 0.15)';
                                return (
                                  <motion.div 
                                    key={key} 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="p-4 rounded-xl relative overflow-hidden"
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
                                    {/* Mini progress bar */}
                                    <div className="mt-2 w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                      <div 
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${(score / 10) * 100}%`, background: getScoreColor(score) }}
                                      />
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

                            {/* Detailed Findings Section */}
                            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid var(--card-border)` }}>
                                <span>🔍</span>
                                <h3 className="font-semibold">Detailed Findings</h3>
                              </div>
                              <div className="p-4 space-y-4 max-h-80 overflow-auto">
                                {[
                                  ['code_structure', 'Structure', '🏗️'],
                                  ['performance', 'Performance', '⚡'],
                                  ['security', 'Security', '🔒'],
                                  ['maintainability', 'Maintainability', '🔧'],
                                  ['readability', 'Readability', '📖'],
                                  ['best_practices', 'Best Practices', '✨'],
                                  ['complexity', 'Complexity', '🧩'],
                                ].map(([key, label, icon]) => {
                                  const item = analysisReport.detailed_scores?.[key];
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
                            <div className="grid md:grid-cols-2 gap-4">
                              {/* Strengths */}
                              {Array.isArray(analysisReport.strengths) && analysisReport.strengths.length > 0 && (
                                <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                                  <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid var(--card-border)`, background: 'rgba(16, 185, 129, 0.1)' }}>
                                    <span>💪</span>
                                    <h3 className="font-semibold text-emerald-400">Strengths</h3>
                                  </div>
                                  <div className="p-4">
                                    <ul className="space-y-2">
                                      {analysisReport.strengths.slice(0, 5).map((s, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                          <span className="text-emerald-400 mt-0.5">✓</span>
                                          <span style={{ color: 'var(--fg-color)' }}>{s}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              )}

                              {/* Action Plan */}
                              {Array.isArray(analysisReport.action_plan) && analysisReport.action_plan.length > 0 && (
                                <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                                  <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid var(--card-border)`, background: 'rgba(20, 184, 166, 0.1)' }}>
                                    <span>🎯</span>
                                    <h3 className="font-semibold text-teal-400">Action Plan</h3>
                                  </div>
                                  <div className="p-4">
                                    <ol className="space-y-2">
                                      {analysisReport.action_plan.slice(0, 5).map((action, i) => (
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

                            {/* Top Issues Banner */}
                            {Array.isArray(analysisReport.top_issues) && analysisReport.top_issues.length > 0 && (
                              <div className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(249, 115, 22, 0.1) 100%)', border: `1px solid rgba(239, 68, 68, 0.3)` }}>
                                <div className="px-4 py-3 flex items-center gap-2">
                                  <span>⚠️</span>
                                  <h3 className="font-semibold text-orange-400">Priority Issues to Address</h3>
                                </div>
                                <div className="px-4 pb-4">
                                  <div className="space-y-2">
                                    {analysisReport.top_issues.slice(0, 4).map((issue, i) => (
                                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
                                        <span className="text-red-400">●</span>
                                        <span className="text-sm" style={{ color: 'var(--fg-color)' }}>{issue}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="rounded-xl p-6 text-center" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                            <div className="text-4xl mb-3">📋</div>
                            <div className="text-sm text-muted">Could not parse structured analysis JSON. Showing raw output below.</div>
                          </div>
                        )}
                      </div>
                    )}

                    {task === 'bug_detection' && (
                      <div className="space-y-6 mb-6">
                        {(() => {
                          const summary = bugReport?.summary || {};
                          const nestedTotal = summary?.total && typeof summary.total === 'object' ? summary.total : null;
                          const getCount = (key) => {
                            if (typeof summary[key] === 'number') return summary[key];
                            if (nestedTotal && typeof nestedTotal[key] === 'number') return nestedTotal[key];
                            return 0;
                          };
                          const totalCount = typeof summary.total === 'number'
                            ? summary.total
                            : (nestedTotal && typeof nestedTotal.total === 'number'
                                ? nestedTotal.total
                                : getCount('Critical') + getCount('High') + getCount('Medium') + getCount('Low'));

                          return (
                            <>
                        {/* Professional Bug Report Header */}
                        <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(249, 115, 22, 0.08) 100%)', border: `1px solid var(--card-border)` }}>
                          <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h2 className="text-xl font-bold" style={{ color: 'var(--fg-color)' }}>🐛 Advanced Bug Scanner Report</h2>
                                <p className="text-sm text-muted mt-1">Static analysis for compile-time, runtime, and logic errors</p>
                              </div>
                              <div className="text-right">
                                <div className="text-4xl font-bold" style={{ 
                                  color: totalCount === 0 ? '#10b981' : 
                                         getCount('Critical') > 0 ? '#ef4444' : 
                                         getCount('High') > 0 ? '#f97316' : '#f59e0b'
                                }}>
                                  {totalCount}
                                </div>
                                <div className="text-xs text-muted mt-1">Issues Found</div>
                              </div>
                            </div>

                            {/* Severity Summary Badges */}
                            {bugReport?.summary && (
                              <div className="flex flex-wrap gap-3 mt-4">
                                {[
                                  { key: 'Critical', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)', icon: '🔴' },
                                  { key: 'High', color: '#f97316', bg: 'rgba(249, 115, 22, 0.2)', icon: '🟠' },
                                  { key: 'Medium', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)', icon: '🟡' },
                                  { key: 'Low', color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)', icon: '🟢' },
                                ].map(({ key, color, bg, icon }) => (
                                  <motion.div
                                    key={key}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full"
                                    style={{ background: bg, border: `1px solid ${color}40` }}
                                  >
                                    <span>{icon}</span>
                                    <span className="text-sm font-medium" style={{ color }}>{key}</span>
                                    <span className="text-lg font-bold" style={{ color }}>{getCount(key)}</span>
                                  </motion.div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {!bugReport ? (
                          <div className="rounded-xl p-6 text-center" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                            <div className="text-4xl mb-3">🔍</div>
                            <div className="text-sm text-muted">Could not parse structured bug report JSON. Showing raw output below.</div>
                          </div>
                        ) : (
                          <>
                            {/* Error Category Cards */}
                            {[
                              { key: 'compile_time_errors', label: 'Compile-Time Errors', icon: '⚙️', desc: 'Syntax and compilation issues' },
                              { key: 'runtime_errors', label: 'Runtime Errors', icon: '💥', desc: 'Potential crashes and exceptions' },
                              { key: 'logic_errors', label: 'Logic Errors', icon: '🧠', desc: 'Flawed reasoning and incorrect implementations' },
                            ].map(({ key, label, icon, desc }) => {
                              const items = bugReport[key];
                              if (!Array.isArray(items) || items.length === 0) return null;
                              
                              const getSeverityColor = (sev) => {
                                const s = (sev || '').toLowerCase();
                                if (s === 'critical') return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)' };
                                if (s === 'high') return { color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.4)' };
                                if (s === 'medium') return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)' };
                                return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)' };
                              };

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
                                    <div className="flex items-center gap-2">
                                      <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                                        {items.length} {items.length === 1 ? 'issue' : 'issues'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="p-4 space-y-3 max-h-96 overflow-auto">
                                    {items.slice(0, 10).map((it, idx) => {
                                      const sevStyle = getSeverityColor(it.severity);
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
                                                {it.severity || 'Unknown'}
                                              </span>
                                              <span className="text-sm font-medium" style={{ color: 'var(--fg-color)' }}>
                                                {it.error_name || it.error_type || 'Issue'}
                                              </span>
                                            </div>
                                            {it.line && (
                                              <span className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--fg-color)' }}>
                                                📍 Line {it.line}{it.column ? `:${it.column}` : ''}
                                              </span>
                                            )}
                                          </div>

                                          {/* Error Message */}
                                          {it.message && (
                                            <div className="text-sm mb-3" style={{ color: 'var(--fg-color)' }}>{it.message}</div>
                                          )}

                                          {/* Code Snippet */}
                                          {it.code_snippet && (
                                            <div className="mb-3">
                                              <div className="text-xs text-muted mb-1">📝 Problematic Code:</div>
                                              <pre className="themed-code font-mono text-xs whitespace-pre p-3 rounded-lg overflow-auto" style={{ background: 'rgba(0,0,0,0.3)' }}>{it.code_snippet}</pre>
                                            </div>
                                          )}

                                          {/* Suggested Fix */}
                                          {it.suggested_fix && (
                                            <div className="p-3 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                              <div className="flex items-center gap-2 mb-1">
                                                <span className="text-emerald-400">💡</span>
                                                <span className="text-xs font-medium text-emerald-400">Suggested Fix:</span>
                                              </div>
                                              <div className="text-sm" style={{ color: 'var(--fg-color)' }}>{it.suggested_fix}</div>
                                            </div>
                                          )}
                                        </motion.div>
                                      );
                                    })}
                                  </div>
                                </motion.div>
                              );
                            })}

                            {/* Top Priorities Section */}
                            {Array.isArray(bugReport.top_priorities) && bugReport.top_priorities.length > 0 && (
                              <div className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(249, 115, 22, 0.08) 100%)', border: `1px solid rgba(239, 68, 68, 0.3)` }}>
                                <div className="px-4 py-3 flex items-center gap-2">
                                  <span>🎯</span>
                                  <h3 className="font-semibold text-orange-400">Top Priority Fixes</h3>
                                </div>
                                <div className="p-4 space-y-2">
                                  {bugReport.top_priorities.slice(0, 5).map((priority, i) => (
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

                            {/* No Issues Found */}
                            {totalCount === 0 && (
                              <div className="rounded-xl p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(20, 184, 166, 0.08) 100%)', border: `1px solid rgba(16, 185, 129, 0.3)` }}>
                                <div className="text-5xl mb-4">🎉</div>
                                <h3 className="text-xl font-bold text-emerald-400 mb-2">No Issues Found!</h3>
                                <p className="text-sm text-muted">Your code passed all static analysis checks. Great job!</p>
                              </div>
                            )}
                          </>
                        )}
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {task === 'documentation' && (
                      <div className="rounded-xl overflow-hidden mb-6" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid var(--card-border)` }}>
                          <h3 className="font-semibold">Documentation</h3>
                        </div>
                        <div className="p-4 space-y-4">
                          {!docReport ? (
                            <div className="text-sm text-muted">Could not parse structured documentation JSON. Showing raw output below.</div>
                          ) : (
                            <>
                              {docReport.overview && (
                                <div className="text-sm" style={{ color: 'var(--fg-color)' }}>{docReport.overview}</div>
                              )}

                              {Array.isArray(docReport.functions) && docReport.functions.length > 0 && (
                                <div>
                                  <div className="text-xs text-muted mb-2">Functions ({docReport.functions.length})</div>
                                  <div className="space-y-2">
                                    {docReport.functions.slice(0, 10).map((fn, i) => (
                                      <div key={i} className="p-3 rounded-lg" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                                        <div className="font-medium text-sm" style={{ color: 'var(--fg-color)' }}>{fn.name}</div>
                                        {fn.signature && <pre className="text-xs text-muted whitespace-pre mt-1">{fn.signature}</pre>}
                                        {fn.description && <div className="text-sm text-muted mt-1">{fn.description}</div>}
                                        {fn.returns && <div className="text-xs text-muted mt-1">Returns: {fn.returns}</div>}
                                        {fn.example && <pre className="themed-code font-mono text-xs whitespace-pre mt-2 overflow-auto">{fn.example}</pre>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {Array.isArray(docReport.classes) && docReport.classes.length > 0 && (
                                <div>
                                  <div className="text-xs text-muted mb-2">Classes ({docReport.classes.length})</div>
                                  <div className="space-y-2">
                                    {docReport.classes.slice(0, 6).map((cls, i) => (
                                      <div key={i} className="p-3 rounded-lg" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                                        <div className="font-medium text-sm" style={{ color: 'var(--fg-color)' }}>{cls.name}</div>
                                        {cls.description && <div className="text-sm text-muted mt-1">{cls.description}</div>}
                                        {Array.isArray(cls.methods) && cls.methods.length > 0 && (
                                          <div className="text-xs text-muted mt-1">Methods: {cls.methods.join(', ')}</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {Array.isArray(docReport.usage_examples) && docReport.usage_examples.length > 0 && (
                                <div>
                                  <div className="text-xs text-muted mb-2">Usage examples</div>
                                  {docReport.usage_examples.slice(0, 3).map((ex, i) => (
                                    <pre key={i} className="themed-code font-mono text-xs whitespace-pre mt-2 overflow-auto">{ex}</pre>
                                  ))}
                                </div>
                              )}

                              {Array.isArray(docReport.notes) && docReport.notes.length > 0 && (
                                <div className="text-xs text-muted">Notes: {docReport.notes.join(' • ')}</div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {task === 'refactoring' && (
                      <div className="rounded-xl overflow-hidden mb-6" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid var(--card-border)` }}>
                          <h3 className="font-semibold">Refactoring Report</h3>
                        </div>
                        <div className="p-4 space-y-4">
                          {!refactorReport ? (
                            <div className="text-sm text-muted">Could not parse structured refactoring JSON. Showing raw output below.</div>
                          ) : (
                            <>
                              {refactorReport.refactored_code && (
                                <div>
                                  <div className="text-xs text-muted mb-2">Refactored Code</div>
                                  <pre className="themed-code font-mono text-sm whitespace-pre leading-relaxed max-h-64 overflow-auto">{refactorReport.refactored_code.replace(/\\n/g, '\n')}</pre>
                                </div>
                              )}

                              {Array.isArray(refactorReport.changes) && refactorReport.changes.length > 0 && (
                                <div>
                                  <div className="text-xs text-muted mb-2">Changes Made</div>
                                  <ul className="list-disc list-inside text-sm" style={{ color: 'var(--fg-color)' }}>
                                    {refactorReport.changes.slice(0, 8).map((c, i) => <li key={i}>{c}</li>)}
                                  </ul>
                                </div>
                              )}

                              {Array.isArray(refactorReport.benefits) && refactorReport.benefits.length > 0 && (
                                <div>
                                  <div className="text-xs text-muted mb-2">Benefits</div>
                                  <ul className="list-disc list-inside text-sm" style={{ color: 'var(--fg-color)' }}>
                                    {refactorReport.benefits.slice(0, 6).map((b, i) => <li key={i}>{b}</li>)}
                                  </ul>
                                </div>
                              )}

                              {Array.isArray(refactorReport.testing_tips) && refactorReport.testing_tips.length > 0 && (
                                <div className="text-xs text-muted">Testing tips: {refactorReport.testing_tips.join(' • ')}</div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Code Section */}
                    {task !== 'analysis' && task !== 'bug_detection' && (
                      <div className="mb-6 rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid var(--card-border)` }}>
                          <h3 className="font-semibold">Optimized Code</h3>
                          <button
                            onClick={async () => { if (!outCode) return; try { await navigator.clipboard.writeText(outCode); setCopied(true); setTimeout(() => setCopied(false), 1200);} catch(_){} }}
                            className="text-xs px-3 py-1.5 rounded-md disabled:opacity-50"
                            style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}
                            disabled={!outCode}
                            title={outCode ? 'Copy code' : 'No code to copy'}
                          >
                            {copied ? 'Copied' : 'Copy'}
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleRunCode}
                              disabled={isRunning}
                              className="text-xs px-3 py-1.5 rounded-md bg-green-600 text-white disabled:opacity-50"
                              title="Run code (dev-only, Python)"
                            >
                              {isRunning ? 'Running…' : 'Run'}
                            </button>
                            <button
                              onClick={handleComparePerformance}
                              disabled={isComparing || !outCode}
                              className="text-xs px-3 py-1.5 rounded-md bg-blue-600 text-white disabled:opacity-50"
                              title={outCode ? 'Run original vs optimized and compare metrics' : 'No optimized code to compare'}
                            >
                              {isComparing ? 'Comparing…' : 'Compare'}
                            </button>
                          </div>
                        </div>
                        <div className="h-72 p-4 overflow-auto">
                          {outCode ? (
                            <pre className="themed-code font-mono text-sm whitespace-pre leading-relaxed">{outCode}</pre>
                          ) : (
                            <div className="h-full flex items-center justify-center text-muted text-sm">No code detected in response</div>
                          )}
                        </div>
                      </div>
                    )}

                    {task === 'optimization' && outCode && quickMetrics && (
                      <div className="mb-6 rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                        <div className="px-4 py-3" style={{ borderBottom: `1px solid var(--card-border)` }}>
                          <h3 className="font-semibold">Quick Metrics</h3>
                        </div>
                        <div className="p-4 grid md:grid-cols-2 gap-4">
                          <div className="p-3 rounded-lg" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                            <div className="text-xs text-muted mb-1">Lines of code</div>
                            <div className="text-sm" style={{ color: 'var(--fg-color)' }}>
                              {quickMetrics.originalLines} → {quickMetrics.optimizedLines}
                              {quickMetrics.lineReductionPct != null ? ` (${quickMetrics.lineReductionPct}% change)` : ''}
                            </div>
                          </div>
                          <div className="p-3 rounded-lg" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                            <div className="text-xs text-muted mb-1">Characters</div>
                            <div className="text-sm" style={{ color: 'var(--fg-color)' }}>
                              {quickMetrics.originalChars} → {quickMetrics.optimizedChars}
                              {quickMetrics.charReductionPct != null ? ` (${quickMetrics.charReductionPct}% change)` : ''}
                            </div>
                          </div>
                        </div>
                        {runCompare?.improvements && (
                          <div className="px-4 pb-4">
                            <div className="text-xs text-muted mb-3">From last performance compare: Speed {runCompare.improvements.speed_improvement_pct ?? '—'}% • Memory {runCompare.improvements.memory_saved_pct ?? '—'}%</div>

                            {/* Bar chart visualization */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-xs text-muted mb-1">Speed (exec time)</div>
                                <div className="flex items-end gap-1 h-12">
                                  <div
                                    className="bg-slate-500 rounded"
                                    style={{
                                      width: '40%',
                                      height: `${Math.min(100, Math.max(10, (runCompare.original?.exec_time_ms ?? 1) / Math.max(1, runCompare.original?.exec_time_ms ?? 1, runCompare.optimized?.exec_time_ms ?? 1) * 100))}%`,
                                    }}
                                    title={`Original: ${runCompare.original?.exec_time_ms} ms`}
                                  />
                                  <div
                                    className="bg-teal-500 rounded"
                                    style={{
                                      width: '40%',
                                      height: `${Math.min(100, Math.max(10, (runCompare.optimized?.exec_time_ms ?? 1) / Math.max(1, runCompare.original?.exec_time_ms ?? 1, runCompare.optimized?.exec_time_ms ?? 1) * 100))}%`,
                                    }}
                                    title={`Optimized: ${runCompare.optimized?.exec_time_ms} ms`}
                                  />
                                </div>
                                <div className="text-xs text-muted mt-1 flex gap-2"><span className="text-slate-400">Orig</span><span className="text-teal-400">Opt</span></div>
                              </div>
                              <div>
                                <div className="text-xs text-muted mb-1">Memory (peak KB)</div>
                                <div className="flex items-end gap-1 h-12">
                                  <div
                                    className="bg-slate-500 rounded"
                                    style={{
                                      width: '40%',
                                      height: `${Math.min(100, Math.max(10, (runCompare.original?.peak_kb ?? 1) / Math.max(1, runCompare.original?.peak_kb ?? 1, runCompare.optimized?.peak_kb ?? 1) * 100))}%`,
                                    }}
                                    title={`Original: ${runCompare.original?.peak_kb ?? '—'} KB`}
                                  />
                                  <div
                                    className="bg-teal-500 rounded"
                                    style={{
                                      width: '40%',
                                      height: `${Math.min(100, Math.max(10, (runCompare.optimized?.peak_kb ?? 1) / Math.max(1, runCompare.original?.peak_kb ?? 1, runCompare.optimized?.peak_kb ?? 1) * 100))}%`,
                                    }}
                                    title={`Optimized: ${runCompare.optimized?.peak_kb ?? '—'} KB`}
                                  />
                                </div>
                                <div className="text-xs text-muted mt-1 flex gap-2"><span className="text-slate-400">Orig</span><span className="text-teal-400">Opt</span></div>
                              </div>
                            </div>

                            {/* Performance history */}
                            {perfHistory.length > 1 && (
                              <div className="mt-4">
                                <div className="text-xs text-muted mb-2">Run history (last {perfHistory.length})</div>
                                <div className="divide-y divide-gray-800/40 max-h-32 overflow-auto">
                                  {perfHistory.slice(0, 5).map((h, i) => (
                                    <div key={h.ts} className="py-1 flex justify-between text-xs">
                                      <span className="text-muted">#{i + 1}</span>
                                      <span>Speed {h.improvements?.speed_improvement_pct ?? '—'}%</span>
                                      <span>Mem {h.improvements?.memory_saved_pct ?? '—'}%</span>
                                      <span className={h.output_match ? 'text-green-400' : 'text-red-400'}>{h.output_match ? 'match' : 'diff'}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Explanation / Raw Output Section */}
                    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid var(--card-border)` }}>
                        <h3 className="font-semibold">{task === 'analysis' || task === 'bug_detection' ? 'Raw Output' : 'Explanation'}</h3>
                        <label className="flex items-center gap-2 text-xs text-muted select-none">
                          <input
                            type="checkbox"
                            checked={professionalMode}
                            onChange={(e) => setProfessionalMode(e.target.checked)}
                            className="h-3.5 w-3.5 rounded"
                            style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                          />
                          Professional formatting
                        </label>
                      </div>
                      <div className="h-56 p-4 overflow-auto">
                        {outExplanation ? (
                          <div className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--fg-color)' }}>
                            {professionalMode ? sanitizeProfessional(outExplanation) : cleanExplanationText(outExplanation)}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-muted text-sm">No explanation provided</div>
                        )}
                        {runResult && (
                          <div className="mt-4 p-3 rounded-lg" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                            <div className="flex justify-between items-center mb-2">
                              <div className="text-sm font-medium">Run Results {runResult.ok ? '✅' : '❌'}</div>
                              {!runResult.ok && runResult.stderr && (
                                <button
                                  onClick={handleAutoFix}
                                  disabled={isOptimizing}
                                  className="px-3 py-1 rounded bg-teal-500/20 text-teal-400 font-bold hover:bg-teal-500/30 transition shadow border border-teal-500/50 text-xs flex items-center gap-2"
                                  title="Send traceback to AI to automatically fix the bug"
                                >
                                  {isOptimizing ? 'Fixing...' : '✨ Auto-Fix Error'}
                                </button>
                              )}
                            </div>
                            <div className="text-xs text-muted mb-2">Time: {runResult.exec_time_ms} ms • Peak: {runResult.memory_mb ?? '—'} MB</div>
                            <div className="text-sm mb-2">Stdout:</div>
                            <pre className="themed-code font-mono text-sm whitespace-pre leading-relaxed max-h-40 overflow-auto">{runResult.stdout || '(no stdout)'}</pre>
                            {runResult.stderr && (
                              <>
                                <div className="text-sm mt-2 mb-1 text-red-400 font-semibold">Stderr:</div>
                                <pre className="themed-code font-mono text-sm whitespace-pre leading-relaxed max-h-40 overflow-auto text-red-500/90">{runResult.stderr}</pre>
                              </>
                            )}
                          </div>
                        )}
                        {runCompare && (
                          <div className="mt-4 p-3 rounded-lg" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                            <div className="text-sm font-medium mb-2">Performance Comparison</div>
                            <div className="text-xs text-muted mb-2">
                              Took: {runCompare.took_ms ?? '—'} ms • Output match: {String(!!runCompare.output_match)}
                            </div>
                            <div className="text-xs text-muted mb-3">
                              Speed: {runCompare.improvements?.speed_improvement_pct ?? '—'}% • Memory: {runCompare.improvements?.memory_saved_pct ?? '—'}%
                            </div>
                            <div className="text-sm mb-2">Original (time: {runCompare.original?.exec_time_ms} ms, peak: {runCompare.original?.peak_kb ?? '—'} KB)</div>
                            <pre className="themed-code font-mono text-sm whitespace-pre leading-relaxed max-h-32 overflow-auto">{runCompare.original?.stdout || '(no stdout)'}</pre>
                            {runCompare.original?.stderr && (
                              <pre className="themed-code font-mono text-sm whitespace-pre leading-relaxed max-h-24 overflow-auto mt-2">{runCompare.original.stderr}</pre>
                            )}
                            <div className="text-sm mt-3 mb-2">Optimized (time: {runCompare.optimized?.exec_time_ms} ms, peak: {runCompare.optimized?.peak_kb ?? '—'} KB)</div>
                            <pre className="themed-code font-mono text-sm whitespace-pre leading-relaxed max-h-32 overflow-auto">{runCompare.optimized?.stdout || '(no stdout)'}</pre>
                            {runCompare.optimized?.stderr && (
                              <pre className="themed-code font-mono text-sm whitespace-pre leading-relaxed max-h-24 overflow-auto mt-2">{runCompare.optimized.stderr}</pre>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>

          {/* Sessions Sidebar */}
          {user && (
            <div className="lg:col-span-1 space-y-4">
              <div className="p-4 rounded-2xl bg-gray-900/40 border border-gray-700/30">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-100">Saved Sessions</h3>
                  <span className="text-xs text-gray-400">{sessions.length}</span>
                </div>
                <div className="divide-y divide-gray-800/60 max-h-96 overflow-auto">
                  {sessions.length === 0 ? (
                    <div className="text-sm text-gray-500 py-6 text-center">No sessions yet</div>
                  ) : sessions.map((s) => (
                    <div key={s.id} className="py-3 flex items-center justify-between gap-3">
                      <button onClick={() => handleLoadSession(s.id)} className="text-left">
                        <div className="text-sm text-gray-200 line-clamp-1">{s.title || `${s.task} • ${s.language}`}</div>
                        <div className="text-xs text-gray-500">{new Date(s.created_at).toLocaleString()}</div>
                      </button>
                      <button onClick={() => handleDeleteSession(s.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch(`${API_BASE}/opt-sessions/export`, { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } });
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = 'sessions_export.json'; a.click();
                        URL.revokeObjectURL(url);
                      } catch {}
                    }}
                    className="text-xs px-3 py-1.5 rounded bg-gray-800 text-gray-100 border border-gray-700"
                  >
                    Export my sessions
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12 grid md:grid-cols-4 gap-6"
          >
            {[
              { icon: "🚀", title: "Performance", desc: "Boost code speed & efficiency" },
              { icon: "🔍", title: "Analysis", desc: "Deep insights & recommendations" },
              { icon: "📚", title: "Documentation", desc: "Auto-generate clear docs" },
              { icon: "🏗️", title: "Refactoring", desc: "Improve code structure" }
            ].map((feature, index) => (
              <motion.div
                key={index}
                whileHover={{ y: -5, scale: 1.02 }}
                className="p-6 rounded-2xl bg-gray-900/40 backdrop-blur-xl border border-gray-700/30 text-center hover:border-teal-500/30 transition-all duration-300"
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="font-semibold mb-2 text-gray-100">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="p-8 rounded-2xl bg-gray-900 border border-gray-700 max-w-md text-center"
            >
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-4">Free Trial Complete!</h2>
              <p className="text-gray-300 mb-6">
                You've used your 2 free optimizations. Sign up to continue with unlimited access!
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="px-6 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => navigate('/auth', { state: { from: '/optimize' } })}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 transition-all duration-200"
                >
                  Sign Up
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {ghModalOpen && (
          <GitHubRepoModal 
            isOpen={ghModalOpen} 
            onClose={() => setGhModalOpen(false)} 
            onFileSelect={(content, filename) => {
              setCode(content);
              setToast({ type: 'success', message: `Imported ${filename} from GitHub!` });
              setTimeout(() => setToast(null), 3000);
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CodeOptimizer;
