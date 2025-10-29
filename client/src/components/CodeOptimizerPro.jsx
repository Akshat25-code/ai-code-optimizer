import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '../config';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CodeEditor from './CodeEditor';
// CSS-only ambient background
const AmbientBackground = () => (
  <>
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="pointer-events-none absolute -top-40 -right-32 w-[40rem] h-[40rem] rounded-full bg-purple-600/15 blur-3xl"
    />
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.1 }}
      className="pointer-events-none absolute -bottom-40 -left-32 w-[40rem] h-[40rem] rounded-full bg-blue-600/15 blur-3xl"
    />
  </>
);

// Professional Code Optimizer Interface
const CodeOptimizer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state?.prefill;
  const { user } = useAuth();
  const [code, setCode] = useState(prefill?.code || '');
  const [language, setLanguage] = useState(prefill?.language || 'python');
  const [customLanguage, setCustomLanguage] = useState('');
  const [task, setTask] = useState(prefill?.task || 'optimization');
  const [aiProvider, setAiProvider] = useState('auto');
  const [optimizedCode, setOptimizedCode] = useState('');
  const [outCode, setOutCode] = useState('');
  const [outExplanation, setOutExplanation] = useState('');
  const [copied, setCopied] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationCount, setOptimizationCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [error, setError] = useState('');
  const [backendHealthy, setBackendHealthy] = useState(null); // null=unknown, true/false
  const [professionalMode, setProfessionalMode] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [saving, setSaving] = useState(false);

  // Lightweight language detection for editor + API when 'Auto' is selected
  const detectLanguage = (text) => {
    const src = text || '';
    if (/\bdef\s+\w+\s*\(|^\s*import\s+\w+(\s+as\s+\w+)?\s*$/m.test(src) || /:\n\s+/.test(src)) return 'python';
    if (/\bfunction\b|=>|console\.log\(/.test(src)) return 'javascript';
    if (/(:\s*string|:\s*number|interface\s+\w+|type\s+\w+\s*=)/.test(src)) return 'typescript';
    if (/#include\s*<.*?>|std::|using\s+namespace\s+std/.test(src)) return 'cpp';
    if (/public\s+class\s+\w+|System\.out\.println|public\s+static\s+void\s+main\s*\(/.test(src)) return 'java';
    if (/package\s+main|fmt\.Print|go\s+\w+\s+\(/.test(src)) return 'go';
    if (/fn\s+main\(\)|let\s+mut|println!\(/.test(src)) return 'rust';
    return 'plaintext';
  };

  const resolvedEditorLanguage = useMemo(() => {
    return language === 'auto' ? detectLanguage(code) : language;
  }, [language, code]);

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
        parts.push({ type: 'code', value: code }); // keep code exactly
        last = m.index + full.length;
      }
      if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });

      const emojiRe = /([\u2700-\u27BF]|[\u2190-\u21FF]|[\u2600-\u26FF]|[\uFE00-\uFE0F]|\u24C2|[\uD83C-\uDBFF][\uDC00-\uDFFF])/g;

      const cleanText = (s) => {
        // Remove emojis/decorative chars
        s = s.replace(emojiRe, '');
        // Strip markdown headings/quotes
        s = s.replace(/^\s*[#>]+\s*/gm, '');
        // Normalize bullets (remove decorative bullets and asterisks)
        s = s.replace(/^\s*[\-\*•]\s+/gm, '- ');
        // Remove bold/italic markers
        s = s.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1');
        s = s.replace(/\*(.*?)\*/g, '$1').replace(/_(.*?)_/g, '$1');
        // Remove inline code backticks
        s = s.replace(/`{1,3}/g, '');
        // Remove standalone code fence lines if any remain
        s = s.replace(/^```[a-zA-Z]*\s*$/gm, '');
        // Trim trailing spaces and collapse extra blank lines
        s = s.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n');
        return s.trim();
      };

      return parts.map(p => p.type === 'code' ? p.value.replace(/[ \t]+$/gm, '').trimEnd() : cleanText(p.value)).join('\n');
    } catch {
      return text; // fallback to original on any error
    }
  };

  // Extract code blocks and explanation from AI output
  const parseAiResult = (text) => {
    if (!text) return { code: '', explanation: '' };
    const codeRegex = /```([a-zA-Z]*)?\n([\s\S]*?)```/g;
    let m, last = 0;
    const codes = [];
    const texts = [];
    while ((m = codeRegex.exec(text)) !== null) {
      const [full, _lang, code] = m;
      const before = text.slice(last, m.index);
      if (before) texts.push(before);
      codes.push(code);
      last = m.index + full.length;
    }
    if (last < text.length) texts.push(text.slice(last));
    const code = codes.join('\n\n').replace(/[ \t]+$/gm, '').trim();
    const explanation = texts.join('\n').trim();
    return { code, explanation };
  };

  useEffect(() => {
    // apply prefill updates if prop changes
    if (prefill) {
      setCode(prefill.code || '');
      setLanguage(prefill.language || 'python');
      setTask(prefill.task || 'optimization');
    }

    let mounted = true;
    fetch(`${API_BASE}/health`).then(async (r) => {
      if (!mounted) return;
      setBackendHealthy(r.ok);
    }).catch(() => {
      if (!mounted) return;
      setBackendHealthy(false);
    });
    return () => { mounted = false; };
  }, [prefill]);

  // Load sessions when user logs in
  useEffect(() => {
    if (!user) { setSessions([]); return; }
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/opt-sessions`, { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } });
        if (resp.ok) {
          const data = await resp.json();
          setSessions(data);
        }
      } catch {}
    })();
  }, [user]);

  const handleOptimizeCode = async () => {
    if (!code.trim()) {
      alert('Please enter some code to optimize!');
      return;
    }

    let effectiveLanguage = language;
    if (language === 'other') {
      effectiveLanguage = (customLanguage.trim() || 'other');
    } else if (language === 'auto') {
      const inferred = detectLanguage(code);
      effectiveLanguage = inferred === 'plaintext' ? 'other' : inferred;
    }

    if (!user && optimizationCount >= 2) {
      setShowAuthModal(true);
      return;
    }

    setIsOptimizing(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE}/analyze-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          language: effectiveLanguage,
          task: task,
          provider: aiProvider === 'auto' ? null : aiProvider
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

  const result = await response.json();
  const raw = result.optimized_code || result.result || '';
  setOptimizedCode(raw || 'No optimization result received');
  const parsed = parseAiResult(raw);
  setOutCode(parsed.code);
  setOutExplanation(parsed.explanation);
      setOptimizationCount(prev => prev + 1);
      
    } catch (error) {
  console.error('Optimization failed:', error);
  setError(`Failed to optimize code: ${error.message}`);
  const fallback = `# ${task} result for ${language}:\n${code}\n\n# AI Suggestions:\n# - Connection to backend failed\n# - Using demo response\n# - Please check your backend server`;
  setOptimizedCode(fallback);
  const parsed = parseAiResult(fallback);
  setOutCode(parsed.code);
  setOutExplanation(parsed.explanation);
      setOptimizationCount(prev => prev + 1);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSaveSession = async () => {
    if (!user) { setShowAuthModal(true); return; }
    setSaving(true);
    try {
      const payload = {
        title: `${task} • ${language}`,
        code,
        language,
        task,
        provider_used: aiProvider,
        result: optimizedCode || outCode || '',
      };
      const resp = await fetch(`${API_BASE}/opt-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(payload),
      });
      if (resp.ok) {
        const item = await resp.json();
        setSessions((prev) => [item, ...prev]);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLoadSession = async (id) => {
    try {
      const resp = await fetch(`${API_BASE}/opt-sessions/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } });
      if (resp.ok) {
        const d = await resp.json();
        setCode(d.code || '');
        setLanguage(d.language || 'python');
        setTask(d.task || 'optimization');
        const parsed = parseAiResult(d.result || '');
        setOptimizedCode(d.result || '');
        setOutCode(parsed.code);
        setOutExplanation(parsed.explanation);
      }
    } catch {}
  };

  const handleDeleteSession = async (id) => {
    try {
      const resp = await fetch(`${API_BASE}/opt-sessions/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } });
      if (resp.status === 204) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {}
  };

  return (
    <div className="min-h-screen relative overflow-hidden theme-hero" style={{ color: 'var(--fg-color)' }}>
      {/* Ambient Background (CSS only) */}
      <div className="absolute inset-0 z-0"><AmbientBackground /></div>

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
            >
              {/* Controls */}
              <div className="p-6 rounded-2xl backdrop-blur-xl border soft-shadow tint-blue tint-outline" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                <h2 className="text-lg font-semibold mb-4">Configuration</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-muted mb-2">Language</label>
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="select w-full" style={{padding:'10px 12px'}}>
                      <option value="auto">Auto (detect)</option>
                      <option value="python">Python</option>
                      <option value="javascript">JavaScript</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                      <option value="typescript">TypeScript</option>
                      <option value="go">Go</option>
                      <option value="rust">Rust</option>
                      <option value="other">Other (specify)</option>
                    </select>
                    {language === 'auto' && (
                      <p className="mt-2 text-xs text-muted">Detected: <span style={{ color: 'var(--fg-color)' }}>{resolvedEditorLanguage}</span></p>
                    )}
                    {language === 'other' && (
                      <input type="text" value={customLanguage} onChange={(e) => setCustomLanguage(e.target.value)} placeholder="Enter language name (e.g., PHP, Kotlin)" className="input mt-3" />
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-muted mb-2">Task</label>
                    <select value={task} onChange={(e) => setTask(e.target.value)} className="select w-full" style={{padding:'10px 12px'}}>
                      <option value="optimization">Optimize</option>
                      <option value="analysis">Analyze</option>
                      <option value="bug_detection">Bug Detection</option>
                      <option value="explanation">Explain</option>
                      <option value="debugging">Debugging</option>
                      <option value="documentation">Document</option>
                      <option value="refactoring">Refactor</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted mb-2">AI Provider</label>
                  <select value={aiProvider} onChange={(e) => setAiProvider(e.target.value)} className="select w-full" style={{padding:'10px 12px'}}>
                    <option value="auto">Auto (Best Choice)</option>
                    <option value="openai">OpenAI GPT</option>
                    <option value="claude">Anthropic Claude</option>
                    <option value="gemini">Google Gemini</option>
                  </select>
                </div>
              </div>

              {/* Code Input */}
              <div className="p-6 rounded-2xl backdrop-blur-xl border soft-shadow tint-rose tint-outline" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                <h2 className="text-lg font-semibold mb-4">Your Code</h2>
                <CodeEditor value={code} onChange={setCode} language={resolvedEditorLanguage} height={320} />
                
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <motion.button
                  onClick={handleOptimizeCode}
                  disabled={isOptimizing}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 relative overflow-hidden group"
                >
                  {isOptimizing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    <span>Optimize Code</span>
                  )}
                </motion.button>
              </div>
            </motion.div>

            {/* Output Section */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-6 lg:col-span-2"
            >
              <div className="p-6 rounded-2xl backdrop-blur-xl border soft-shadow tint-violet tint-outline h-full" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold">Optimized Result</h2>
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

                {!optimizedCode && (
                  <div className="h-96 rounded-xl p-4 overflow-auto flex items-center justify-center text-center text-muted" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                    {isOptimizing ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                          className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full mx-auto mb-3"
                        />
                        <p className="text-purple-500">AI is optimizing your {language} code...</p>
                      </motion.div>
                    ) : (
                      <div>
                        <div className="text-6xl mb-4 opacity-50">💡</div>
                        <p className="text-sm">Enter your code and click the button to get started</p>
                      </div>
                    )}
                  </div>
                )}

                {optimizedCode && (
                  <>
                    {/* Code Section */}
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
                      </div>
                      <div className="h-72 p-4 overflow-auto">
                        {outCode ? (
                          <pre className="themed-code font-mono text-sm whitespace-pre leading-relaxed">{outCode}</pre>
                        ) : (
                          <div className="h-full flex items-center justify-center text-muted text-sm">No code detected in response</div>
                        )}
                      </div>
                    </div>

                    {/* Explanation Section */}
                    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid var(--card-border)` }}>
                        <h3 className="font-semibold">Explanation</h3>
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
                            {professionalMode ? sanitizeProfessional(outExplanation) : outExplanation}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-muted text-sm">No explanation provided</div>
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
                className="p-6 rounded-2xl bg-gray-900/40 backdrop-blur-xl border border-gray-700/30 text-center hover:border-purple-500/30 transition-all duration-300"
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
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all duration-200"
                >
                  Sign Up
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CodeOptimizer;