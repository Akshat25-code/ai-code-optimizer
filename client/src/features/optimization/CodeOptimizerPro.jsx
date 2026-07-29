import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import CodeEditor from '@/components/editor/CodeEditor';
import AmbientBackground from '@/components/ui/AmbientBackground';
import { Toast, ProgressBar } from '@/components/ui/ProgressIndicator';
import ConfigPanel, { CodeInputPanel } from '@/features/optimization/ConfigPanel';
import RepoImporter from '@/features/optimization/RepoImporter';
import TestGenerator from '@/features/optimization/TestGenerator';
import AnalyticsDashboard from '@/features/analysis/AnalyticsDashboard';
import useOptimizer, { parseAiResult } from '@/features/optimization/useOptimizer';
import GitHubRepoModal from '@/features/repository/GitHubRepoModal';
import ProofPanel from '@/components/reports/ProofPanel';
import ComplexityDashboard from '@/components/reports/ComplexityDashboard';
import TraceRunner from '@/features/visualization/TraceRunner';
import ViolationsPanel from '@/features/rules/ViolationsPanel';
import QualityTrendPanel from '@/features/analysis/QualityTrendPanel';
import TeamDashboard from '@/features/team/TeamDashboard';
import CollaborativeEditor from '@/features/team/CollaborativeEditor';
import ShareModal from '@/features/team/ShareModal';
import CommandPalette from '@/features/shortcuts/CommandPalette';
import useKeyboardShortcuts from '@/features/shortcuts/useKeyboardShortcuts';
import ExportOptions from '@/features/reports/ExportOptions';
import OnboardingTour from '@/features/onboarding/OnboardingTour';

// Professional Code Optimizer Interface
const CodeOptimizer = () => {
  const [activeTab, setActiveTab] = React.useState('code');
  const [githubContext, setGithubContext] = React.useState(null);
  const {
    code, setCode, language, setLanguage, supportedLanguages, task, setTask,
    aiProvider, setAiProvider, compareMode, setCompareMode,
    selectedProviders, setSelectedProviders, optimizedCode, outCode, outExplanation,
    compareResults, copied, setCopied, isOptimizing, optimizationCount,
    showAuthModal, setShowAuthModal, error, setError, backendHealthy,
    professionalMode, setProfessionalMode, progressStep, toast, setToast,
    sessions, saving, runResult, isRunning, runCompare, isComparing, verificationReport, isVerifying, perfHistory,
    lastTokens, analytics, fetchAnalytics, ghModalOpen, setGhModalOpen, currentSessionId,
    inspection, isInspecting,
    complexityReport, isAnalyzingComplexity,
    streaming, streamingEnabled, setStreamingEnabled,
    userInstructions, setUserInstructions, optimizationFocus, setOptimizationFocus,
    resolvedEditorLanguage, analysisReport, bugReport, docReport, refactorReport, quickMetrics,
    user, navigate,
    handleOptimizeCode, handleCompareModels, handleSaveSession,
    handleRunCode, handleAutoFix, handleComparePerformance, handleLoadSession, handleDeleteSession,
    handleDownloadInspectionReport, handleVerifyOptimization,
    verification, testResults, secretsScan, providerStatus, repoHealth
  } = useOptimizer();

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false);

  const location = useLocation();

  // Load prefill data from WelcomePage "Try it" button
  React.useEffect(() => {
    if (location.state?.prefill) {
      const s = location.state.prefill;
      setCode(s.code);
      setLanguage(s.language);
      setTask(s.task);
      // Clear state so it doesn't run again on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location, setCode, setLanguage, setTask]);

  // Global Keyboard Shortcuts
  useKeyboardShortcuts([
    { key: 'k', ctrl: true, global: true, action: (e) => { setIsCommandPaletteOpen(true); } },
    { key: 'Enter', ctrl: true, global: false, action: (e) => {
      if (task === 'optimization') handleOptimizeCode();
      else handleRunCode();
    } },
    { key: 's', ctrl: true, global: false, action: (e) => { handleSaveSession(); } },
  ]);

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

      // eslint-disable-next-line no-control-regex
      const emojiRe = /([\u2700-\u27BF]|[\u2190-\u21FF]|[\u2600-\u26FF]|[\uFE00-\uFE0F]|\u24C2|[\uD83C-\uDBFF][\uDC00-\uDFFF])/g;
      const cleanText = (s) => {
        s = s.replace(emojiRe, '');
        s = s.replace(/^\s*[#>]+\s*/gm, '');
        s = s.replace(/^\s*[-*â€¢]\s+/gm, '- ');
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

  const proofTone = (status) => {
    if (status === 'passed') return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)' };
    if (status === 'failed') return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)' };
    if (status === 'warning') return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)' };
    return { color: 'var(--muted-color)', bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.25)' };
  };

  const scoreColor = (score = 0) => {
    if (score >= 85) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="min-h-screen relative overflow-hidden theme-hero" style={{ color: 'var(--fg-color)' }}>
      {/* Ambient Background (CSS only) */}
      <div className="absolute inset-0 z-0"><AmbientBackground /></div>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onRun={task === 'optimization' ? handleOptimizeCode : handleRunCode}
        onSave={handleSaveSession}
      />
      <OnboardingTour />

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
              {progressStep === 'inspecting' && 'Inspecting code locally...'}
              {progressStep === 'connecting' && 'Connecting to AI...'}
              {progressStep === 'streaming' && (streaming?.isStreaming
                ? `Streaming from ${streaming.streamProvider || 'AI'}...`
                : 'Starting stream...')}
              {progressStep === 'processing' && 'AI is thinking...'}
              {progressStep === 'rendering' && 'Rendering results...'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live streaming panel */}
      <AnimatePresence>
        {streaming?.isStreaming && streaming.streamText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-4 right-4 z-40 w-[480px] max-w-[90vw] rounded-xl shadow-2xl overflow-hidden"
            style={{ background: 'var(--card-bg, #1a1a2e)', border: '1px solid var(--card-border, #333)' }}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: 'var(--card-border, #333)' }}>
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Live from {streaming.streamProvider || 'AI'}
              </div>
              <button
                onClick={streaming.stopStream}
                className="text-xs px-2 py-1 rounded hover:bg-red-500/20 text-red-400"
              >
                Stop
              </button>
            </div>
            <pre className="p-3 text-[11px] font-mono max-h-64 overflow-auto whitespace-pre-wrap opacity-90">
              {streaming.streamCode || streaming.streamText.slice(-2000)}
              <span className="inline-block w-2 h-3 bg-teal-400 animate-pulse ml-0.5" />
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Main Interface */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Input Section */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              {/* Top Action Bar */}
              <div className="flex justify-between items-center bg-[var(--surface-1)] border border-[var(--card-border)] rounded-xl p-3 shadow-sm mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></div>
                  <span className="text-sm font-medium">Session: <span className="font-mono text-xs">{currentSessionId?.slice(0, 8)}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <ExportOptions code={code} language={resolvedEditorLanguage} sessionData={{ task }} />
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="tour-step-4-share px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-teal-500/20"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                    Share
                  </button>
                </div>
              </div>

              {/* Controls */}
              <div className="tour-step-2-config">
                <ConfigPanel
                  language={language} setLanguage={setLanguage} supportedLanguages={supportedLanguages}
                  resolvedEditorLanguage={resolvedEditorLanguage} task={task} setTask={setTask}
                  aiProvider={aiProvider} setAiProvider={setAiProvider} compareMode={compareMode} setCompareMode={setCompareMode}
                  selectedProviders={selectedProviders} setSelectedProviders={setSelectedProviders}
                  userInstructions={userInstructions} setUserInstructions={setUserInstructions}
                  optimizationFocus={optimizationFocus} setOptimizationFocus={setOptimizationFocus}
                  setGhModalOpen={setGhModalOpen}
                />
              </div>


              {/* Input Tabs */}
              <div className="flex items-center gap-2 mb-2 p-1 bg-[var(--surface-1)] border border-[var(--card-border)] rounded-lg w-fit">
                <button
                  onClick={() => setActiveTab('code')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'code' ? 'bg-cyan-500/20 text-cyan-400 shadow-sm border border-cyan-500/30' : 'text-muted hover:text-[var(--fg-color)]'}`}
                >
                  File Snippet
                </button>
                <button
                  onClick={() => setActiveTab('repo')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'repo' ? 'bg-cyan-500/20 text-cyan-400 shadow-sm border border-cyan-500/30' : 'text-muted hover:text-[var(--fg-color)]'}`}
                >
                  Import Repository
                </button>
                <button
                  onClick={() => setActiveTab('test')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'test' ? 'bg-emerald-500/20 text-emerald-400 shadow-sm border border-emerald-500/30' : 'text-muted hover:text-[var(--fg-color)]'}`}
                >
                  Test Studio
                </button>
              </div>

              {/* Input Section */}
              <AnimatePresence mode="wait">
                {activeTab === 'repo' && (
                  <motion.div
                    key="repo"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                  >
                    <RepoImporter
                      onImportComplete={(data) => {
                        setCode(data.bundled_context);
                        setLanguage("Markdown");
                        setActiveTab('code');
                        setToast({ type: 'success', message: `Imported ${data.file_count} files successfully!` });
                      }}
                    />
                  </motion.div>
                )}

                {activeTab === 'code' && (
                  <motion.div
                    key="code"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="tour-step-1-code"
                  >
                    <CodeInputPanel
                      code={code} setCode={setCode} resolvedEditorLanguage={resolvedEditorLanguage}
                      error={error} setError={setError} isOptimizing={isOptimizing}
                      handleOptimizeCode={handleOptimizeCode} backendHealthy={backendHealthy}
                      progressStep={progressStep}
                    />
                  </motion.div>
                )}

                {activeTab === 'test' && (
                  <motion.div
                    key="test"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                  >
                    <TestGenerator
                      sourceCode={code}
                      language={resolvedEditorLanguage}
                      aiProvider={aiProvider}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

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
                        {saving ? 'Savingâ€¦' : 'Save Session'}
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
                          {progressStep === 'inspecting' && 'Inspecting code locally...'}
                          {progressStep === 'connecting' && 'Connecting to AI...'}
                          {progressStep === 'processing' && 'AI is processing your request...'}
                          {progressStep === 'rendering' && 'Rendering results...'}
                          {!progressStep && 'AI is processing your request...'}
                        </p>
                      </motion.div>
                    ) : (
                      <div>
                        <div className="text-6xl mb-4 opacity-50">ðŸ’¡</div>
                        <p className="text-sm">Enter your code and click the button to get started</p>
                      </div>
                    )}
                  </div>
                )}

                {compareResults && (
                  <div className="space-y-4">
                    <div className="text-xs text-muted">Compared: {(compareResults.providers || []).join(', ')} â€¢ Took: {compareResults.took_ms}ms</div>
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
                              <div className="text-xs text-muted">{item?.status}{item?.duration_ms != null ? ` â€¢ ${item.duration_ms}ms` : ''}</div>
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

                {inspection && (
                  <div className="mb-6 rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                    <div className="px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3" style={{ borderBottom: `1px solid var(--card-border)` }}>
                      <div>
                        <h3 className="font-semibold">Local Proof Report</h3>
                        <div className="text-xs text-muted mt-1">
                          Deterministic scan from {inspection.engine || 'local engine'}{isInspecting ? ' - refreshing' : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleVerifyOptimization}
                          disabled={isVerifying || !outCode}
                          className="px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-50"
                          style={{ border: `1px solid var(--card-border)`, background: 'rgba(255,255,255,0.04)' }}
                          title="Run original and optimized code on the backend and verify output match"
                        >
                          {isVerifying ? 'Verifying...' : 'Verify'}
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadInspectionReport}
                          className="px-3 py-2 rounded-lg text-xs font-medium"
                          style={{ border: `1px solid var(--card-border)`, background: 'rgba(255,255,255,0.04)' }}
                          title="Download Markdown proof report"
                        >
                          Export Report
                        </button>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold" style={{ color: scoreColor(inspection.score) }}>{inspection.score_10}</span>
                          <span className="text-sm text-muted">/10 local score</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                          ['Lines', inspection.summary?.lines ?? 0],
                          ['Functions', inspection.summary?.functions ?? 0],
                          ['Classes', inspection.summary?.classes ?? 0],
                          ['Findings', inspection.summary?.findings ?? 0],
                          ['Max complexity', inspection.summary?.max_complexity ?? 0],
                        ].map(([label, value]) => (
                          <div key={label} className="p-3 rounded-lg" style={{ border: `1px solid var(--card-border)` }}>
                            <div className="text-xs text-muted mb-1">{label}</div>
                            <div className="text-lg font-semibold">{value}</div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {(inspection.proof_badges || []).map((badge) => {
                          const tone = proofTone(badge.status);
                          return (
                            <div
                              key={`${badge.label}-${badge.status}`}
                              className="px-3 py-2 rounded-lg text-xs"
                              style={{ color: tone.color, background: tone.bg, border: `1px solid ${tone.border}` }}
                              title={badge.detail}
                            >
                              <span className="font-semibold">{badge.label}</span>
                              <span className="opacity-80"> - {badge.detail}</span>
                            </div>
                          );
                        })}
                      </div>

                      {inspection.comparison && (
                        <div className="grid md:grid-cols-4 gap-3">
                          {[
                            ['Score delta', inspection.comparison.score_delta],
                            ['Line delta', inspection.comparison.line_delta],
                            ['Finding delta', inspection.comparison.finding_delta],
                            ['Complexity delta', inspection.comparison.max_complexity_delta],
                          ].map(([label, value]) => (
                            <div key={label} className="p-3 rounded-lg" style={{ border: `1px solid var(--card-border)` }}>
                              <div className="text-xs text-muted mb-1">{label}</div>
                              <div className={`text-sm font-semibold ${Number(value) > 0 ? 'text-green-400' : Number(value) < 0 ? 'text-red-400' : ''}`}>
                                {Number(value) > 0 ? `+${value}` : value}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {complexityReport && (
                        <ComplexityDashboard
                          data={complexityReport}
                          comparison={complexityReport?.comparison}
                        />
                      )}

                      {verificationReport && (
                        <div className="p-4 rounded-lg" style={{ border: `1px solid var(--card-border)` }}>
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                            <div>
                              <div className="text-sm font-semibold">{verificationReport.status || 'Verification result'}</div>
                              <div className="text-xs text-muted">Engine: {verificationReport.engine || 'verification-engine-v1'}</div>
                            </div>
                            <span
                              className="text-xs px-3 py-1.5 rounded-md self-start"
                              style={{
                                color: proofTone(verificationReport.verified ? 'passed' : 'failed').color,
                                background: proofTone(verificationReport.verified ? 'passed' : 'failed').bg,
                              }}
                            >
                              {verificationReport.verified ? 'Verified' : 'Unverified'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                            {[
                              ['Output match', verificationReport.proof_panel?.output_match ? 'yes' : 'no'],
                              ['Original ms', verificationReport.proof_panel?.original_runtime_ms ?? '-'],
                              ['Optimized ms', verificationReport.proof_panel?.optimized_runtime_ms ?? '-'],
                              ['Speed gain', verificationReport.proof_panel?.speed_gain_pct != null ? `${verificationReport.proof_panel.speed_gain_pct}%` : '-'],
                              ['Score delta', verificationReport.proof_panel?.score_delta ?? 0],
                            ].map(([label, value]) => (
                              <div key={label} className="p-3 rounded-lg" style={{ border: `1px solid var(--card-border)` }}>
                                <div className="text-xs text-muted mb-1">{label}</div>
                                <div className="text-sm font-semibold">{value}</div>
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {(verificationReport.proof_badges || []).map((badge) => {
                              const tone = proofTone(badge.status);
                              return (
                                <span
                                  key={`${badge.label}-${badge.status}`}
                                  className="px-2.5 py-1.5 rounded-md text-xs"
                                  style={{ color: tone.color, background: tone.bg, border: `1px solid ${tone.border}` }}
                                  title={badge.detail || badge.label}
                                >
                                  {badge.label}: {badge.status}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {(inspection.findings || []).length > 0 && (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Top findings</div>
                          <div className="space-y-2 max-h-52 overflow-auto">
                            {(inspection.findings || []).slice(0, 4).map((finding) => {
                              const tone = proofTone(finding.severity === 'High' || finding.severity === 'Critical' ? 'failed' : finding.severity === 'Medium' ? 'warning' : 'passed');
                              return (
                                <div key={finding.id} className="p-3 rounded-lg" style={{ border: `1px solid var(--card-border)` }}>
                                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                                    <div className="text-sm font-medium">{finding.title}</div>
                                    <span className="text-xs px-2 py-1 rounded-md self-start" style={{ color: tone.color, background: tone.bg }}>
                                      {finding.severity} - {finding.category}
                                    </span>
                                  </div>
                                  <div className="text-xs text-muted mt-1">{finding.detail}</div>
                                  {finding.suggestion && <div className="text-xs mt-2 text-teal-400">{finding.suggestion}</div>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {(inspection.recommendations || []).length > 0 && (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Next actions</div>
                          <ul className="text-xs text-muted list-disc pl-5 space-y-1">
                            {(inspection.recommendations || []).slice(0, 4).map((item, index) => <li key={index}>{item}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {task === 'analytics' && (
                  <div className="mb-10 space-y-8">
                    <AnalyticsDashboard analytics={analytics} fetchAnalytics={fetchAnalytics} />
                    <QualityTrendPanel />
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
                                <h2 className="text-xl font-bold" style={{ color: 'var(--fg-color)' }}>ðŸ“Š Code Analysis Report Card</h2>
                                <p className="text-sm text-muted mt-1">Comprehensive assessment across 7 quality dimensions</p>
                              </div>
                              <div className="text-right">
                                <div className="text-4xl font-bold" style={{
                                  color: (analysisReport?.overall_score ?? 0) >= 8 ? '#10b981' :
                                         (analysisReport?.overall_score ?? 0) >= 6 ? '#f59e0b' :
                                         (analysisReport?.overall_score ?? 0) >= 4 ? '#f97316' : '#ef4444'
                                }}>
                                  {analysisReport?.overall_score ?? 'â€”'}
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
                                ['code_structure', 'Structure', 'ðŸ—ï¸'],
                                ['performance', 'Performance', 'âš¡'],
                                ['security', 'Security', 'ðŸ”’'],
                                ['maintainability', 'Maintainability', 'ðŸ”§'],
                                ['readability', 'Readability', 'ðŸ“–'],
                                ['best_practices', 'Best Practices', 'âœ¨'],
                                ['complexity', 'Complexity', 'ðŸ§©'],
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
                                <span>ðŸ”</span>
                                <h3 className="font-semibold">Detailed Findings</h3>
                              </div>
                              <div className="p-4 space-y-4 max-h-80 overflow-auto">
                                {[
                                  ['code_structure', 'Structure', 'ðŸ—ï¸'],
                                  ['performance', 'Performance', 'âš¡'],
                                  ['security', 'Security', 'ðŸ”’'],
                                  ['maintainability', 'Maintainability', 'ðŸ”§'],
                                  ['readability', 'Readability', 'ðŸ“–'],
                                  ['best_practices', 'Best Practices', 'âœ¨'],
                                  ['complexity', 'Complexity', 'ðŸ§©'],
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
                                    <span>ðŸ’ª</span>
                                    <h3 className="font-semibold text-emerald-400">Strengths</h3>
                                  </div>
                                  <div className="p-4">
                                    <ul className="space-y-2">
                                      {analysisReport.strengths.slice(0, 5).map((s, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                          <span className="text-emerald-400 mt-0.5">âœ“</span>
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
                                    <span>ðŸŽ¯</span>
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
                                  <span>âš ï¸</span>
                                  <h3 className="font-semibold text-orange-400">Priority Issues to Address</h3>
                                </div>
                                <div className="px-4 pb-4">
                                  <div className="space-y-2">
                                    {analysisReport.top_issues.slice(0, 4).map((issue, i) => (
                                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
                                        <span className="text-red-400">â—</span>
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
                            <div className="text-4xl mb-3">ðŸ“‹</div>
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
                                <h2 className="text-xl font-bold" style={{ color: 'var(--fg-color)' }}>ðŸ› Advanced Bug Scanner Report</h2>
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
                                  { key: 'Critical', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)', icon: 'ðŸ”´' },
                                  { key: 'High', color: '#f97316', bg: 'rgba(249, 115, 22, 0.2)', icon: 'ðŸŸ ' },
                                  { key: 'Medium', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)', icon: 'ðŸŸ¡' },
                                  { key: 'Low', color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)', icon: 'ðŸŸ¢' },
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
                            <div className="text-4xl mb-3">ðŸ”</div>
                            <div className="text-sm text-muted">Could not parse structured bug report JSON. Showing raw output below.</div>
                          </div>
                        ) : (
                          <>
                            {/* Error Category Cards */}
                            {[
                              { key: 'compile_time_errors', label: 'Compile-Time Errors', icon: 'âš™ï¸', desc: 'Syntax and compilation issues' },
                              { key: 'runtime_errors', label: 'Runtime Errors', icon: 'ðŸ’¥', desc: 'Potential crashes and exceptions' },
                              { key: 'logic_errors', label: 'Logic Errors', icon: 'ðŸ§ ', desc: 'Flawed reasoning and incorrect implementations' },
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
                                                ðŸ“ Line {it.line}{it.column ? `:${it.column}` : ''}
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
                                              <div className="text-xs text-muted mb-1">ðŸ“ Problematic Code:</div>
                                              <pre className="themed-code font-mono text-xs whitespace-pre p-3 rounded-lg overflow-auto" style={{ background: 'rgba(0,0,0,0.3)' }}>{it.code_snippet}</pre>
                                            </div>
                                          )}

                                          {/* Suggested Fix */}
                                          {it.suggested_fix && (
                                            <div className="p-3 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                              <div className="flex items-center gap-2 mb-1">
                                                <span className="text-emerald-400">ðŸ’¡</span>
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
                                  <span>ðŸŽ¯</span>
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
                                          <div className="text-xs text-emerald-400 mt-1">ðŸ’¡ {priority.suggested_fix}</div>
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
                                <div className="text-5xl mb-4">ðŸŽ‰</div>
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
                                <div className="text-xs text-muted">Notes: {docReport.notes.join(' â€¢ ')}</div>
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
                                <div className="text-xs text-muted">Testing tips: {refactorReport.testing_tips.join(' â€¢ ')}</div>
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
                            onClick={async () => { if (!outCode) return; try { await navigator.clipboard.writeText(outCode); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch (_e) { /* clipboard unavailable */ } }}
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
                              {isRunning ? 'Runningâ€¦' : 'Run'}
                            </button>
                            <button
                              onClick={handleComparePerformance}
                              disabled={isComparing || !outCode}
                              className="text-xs px-3 py-1.5 rounded-md bg-blue-600 text-white disabled:opacity-50"
                              title={outCode ? 'Run original vs optimized and compare metrics' : 'No optimized code to compare'}
                            >
                              {isComparing ? 'Comparingâ€¦' : 'Compare'}
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
                              {quickMetrics.originalLines} â†’ {quickMetrics.optimizedLines}
                              {quickMetrics.lineReductionPct != null ? ` (${quickMetrics.lineReductionPct}% change)` : ''}
                            </div>
                          </div>
                          <div className="p-3 rounded-lg" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                            <div className="text-xs text-muted mb-1">Characters</div>
                            <div className="text-sm" style={{ color: 'var(--fg-color)' }}>
                              {quickMetrics.originalChars} â†’ {quickMetrics.optimizedChars}
                              {quickMetrics.charReductionPct != null ? ` (${quickMetrics.charReductionPct}% change)` : ''}
                            </div>
                          </div>
                        </div>
                        {runCompare?.improvements && (
                          <div className="px-4 pb-4">
                            <div className="text-xs text-muted mb-3">From last performance compare: Speed {runCompare.improvements.speed_improvement_pct ?? 'â€”'}% â€¢ Memory {runCompare.improvements.memory_saved_pct ?? 'â€”'}%</div>

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
                                    title={`Original: ${runCompare.original?.peak_kb ?? 'â€”'} KB`}
                                  />
                                  <div
                                    className="bg-teal-500 rounded"
                                    style={{
                                      width: '40%',
                                      height: `${Math.min(100, Math.max(10, (runCompare.optimized?.peak_kb ?? 1) / Math.max(1, runCompare.original?.peak_kb ?? 1, runCompare.optimized?.peak_kb ?? 1) * 100))}%`,
                                    }}
                                    title={`Optimized: ${runCompare.optimized?.peak_kb ?? 'â€”'} KB`}
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
                                      <span>Speed {h.improvements?.speed_improvement_pct ?? 'â€”'}%</span>
                                      <span>Mem {h.improvements?.memory_saved_pct ?? 'â€”'}%</span>
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
                              <div className="text-sm font-medium">Run Results {runResult.ok ? 'âœ…' : 'âŒ'}</div>
                              {!runResult.ok && runResult.stderr && (
                                <button
                                  onClick={handleAutoFix}
                                  disabled={isOptimizing}
                                  className="px-3 py-1 rounded bg-teal-500/20 text-teal-400 font-bold hover:bg-teal-500/30 transition shadow border border-teal-500/50 text-xs flex items-center gap-2"
                                  title="Send traceback to AI to automatically fix the bug"
                                >
                                  {isOptimizing ? 'Fixing...' : 'âœ¨ Auto-Fix Error'}
                                </button>
                              )}
                            </div>
                            <div className="text-xs text-muted mb-2">Time: {runResult.exec_time_ms} ms â€¢ Peak: {runResult.memory_mb ?? 'â€”'} MB</div>
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
                              Took: {runCompare.took_ms ?? 'â€”'} ms â€¢ Output match: {String(!!runCompare.output_match)}
                            </div>
                            <div className="text-xs text-muted mb-3">
                              Speed: {runCompare.improvements?.speed_improvement_pct ?? 'â€”'}% â€¢ Memory: {runCompare.improvements?.memory_saved_pct ?? 'â€”'}%
                            </div>
                            <div className="text-sm mb-2">Original (time: {runCompare.original?.exec_time_ms} ms, peak: {runCompare.original?.peak_kb ?? 'â€”'} KB)</div>
                            <pre className="themed-code font-mono text-sm whitespace-pre leading-relaxed max-h-32 overflow-auto">{runCompare.original?.stdout || '(no stdout)'}</pre>
                            {runCompare.original?.stderr && (
                              <pre className="themed-code font-mono text-sm whitespace-pre leading-relaxed max-h-24 overflow-auto mt-2">{runCompare.original.stderr}</pre>
                            )}
                            <div className="text-sm mt-3 mb-2">Optimized (time: {runCompare.optimized?.exec_time_ms} ms, peak: {runCompare.optimized?.peak_kb ?? 'â€”'} KB)</div>
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

          {/* Proof Panel */}
          <div className="lg:col-span-1">
            <ProofPanel
              inspection={inspection}
              verification={verification}
              runCompare={runCompare}
              testResults={testResults}
              secretsScan={secretsScan}
              providerStatus={providerStatus}
              repoHealth={repoHealth}
              githubContext={githubContext}
              optimizedCode={optimizedCode}
              originalCode={code}
              language={resolvedEditorLanguage}
            />
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
                        <div className="text-sm text-gray-200 line-clamp-1">{s.title || `${s.task} â€¢ ${s.language}`}</div>
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
                        const res = await fetch(`${API_BASE}/opt-sessions/export`, { credentials: 'include' });
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = 'sessions_export.json'; a.click();
                        URL.revokeObjectURL(url);
                      } catch (_e) { /* export download failed */ }
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
              { icon: "ðŸš€", title: "Performance", desc: "Boost code speed & efficiency" },
              { icon: "ðŸ”", title: "Analysis", desc: "Deep insights & recommendations" },
              { icon: "ðŸ“š", title: "Documentation", desc: "Auto-generate clear docs" },
              { icon: "ðŸ—ï¸", title: "Refactoring", desc: "Improve code structure" }
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
              <div className="text-6xl mb-4">ðŸŽ‰</div>
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
            onFileSelect={(content, filename, context) => {
              setCode(content);
              if (context) setGithubContext(context);
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

