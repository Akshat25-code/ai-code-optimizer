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
      className="pointer-events-none absolute -top-40 -right-32 w-[40rem] h-[40rem] rounded-full bg-teal-500/15 blur-3xl"
    />
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.1 }}
      className="pointer-events-none absolute -bottom-40 -left-32 w-[40rem] h-[40rem] rounded-full bg-emerald-500/15 blur-3xl"
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
  const [language, setLanguage] = useState(prefill?.language || 'auto');
  const [supportedLanguages, setSupportedLanguages] = useState([]); // from backend
  const [task, setTask] = useState(prefill?.task || 'optimization');
  const [aiProvider, setAiProvider] = useState('auto');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedProviders, setSelectedProviders] = useState({ openai: true, claude: true, gemini: true });
  const [optimizedCode, setOptimizedCode] = useState('');
  const [outCode, setOutCode] = useState('');
  const [outExplanation, setOutExplanation] = useState('');
  const [compareResults, setCompareResults] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationCount, setOptimizationCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [error, setError] = useState('');
  const [backendHealthy, setBackendHealthy] = useState(null); // null=unknown, true/false
  const [professionalMode, setProfessionalMode] = useState(true);
  const [progressStep, setProgressStep] = useState(''); // e.g., 'validating' | 'connecting' | 'processing' | 'rendering'
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: string }
  const [sessions, setSessions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runCompare, setRunCompare] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [perfHistory, setPerfHistory] = useState([]);  // last N compare runs

  const [userInstructions, setUserInstructions] = useState(
    prefill?.user_instructions || 'Minimize code length while maintaining readability and performance.'
  );
  const [optimizationFocus, setOptimizationFocus] = useState({
    time_complexity: true,
    space_complexity: false,
    code_length: true,
    readability: true,
    performance: true,
    memory: false,
  });

  const focusOptions = [
    { key: 'time_complexity', label: 'Time complexity' },
    { key: 'space_complexity', label: 'Space complexity' },
    { key: 'code_length', label: 'Code length' },
    { key: 'readability', label: 'Readability' },
    { key: 'performance', label: 'Performance' },
    { key: 'memory', label: 'Memory' },
  ];

  // Lightweight language detection for editor + API when 'Auto' is selected
  const detectLanguage = (text) => {
    const src = text || '';
    if (/\bdef\s+\w+\s*\(|^\s*import\s+\w+(\s+as\s+\w+)?\s*$/m.test(src) || /:\n\s+/.test(src)) return 'Python';
    if (/\bfunction\b|=>|console\.log\(/.test(src)) return 'JavaScript';
    if (/(:\s*string|:\s*number|interface\s+\w+|type\s+\w+\s*=)/.test(src)) return 'TypeScript';
    if (/#include\s*<.*?>|std::|using\s+namespace\s+std/.test(src)) return 'C++';
    if (/public\s+class\s+\w+|System\.out\.println|public\s+static\s+void\s+main\s*\(/.test(src)) return 'Java';
    if (/package\s+main|fmt\.Print|go\s+\w+\s+\(/.test(src)) return 'Go';
    if (/fn\s+main\(\)|let\s+mut|println!\(/.test(src)) return 'Rust';
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

  const tryParseJsonObject = (text) => {
    if (!text) return null;
    const s = String(text).trim();
    try {
      return JSON.parse(s);
    } catch {}

    // Try to extract a JSON object substring
    const first = s.indexOf('{');
    const last = s.lastIndexOf('}');
    if (first >= 0 && last > first) {
      const candidate = s.slice(first, last + 1);
      try {
        return JSON.parse(candidate);
      } catch {}
    }
    return null;
  };

  const analysisReport = useMemo(() => {
    if (task !== 'analysis') return null;
    return tryParseJsonObject(outExplanation || optimizedCode);
  }, [task, outExplanation, optimizedCode]);

  const bugReport = useMemo(() => {
    if (task !== 'bug_detection') return null;
    return tryParseJsonObject(outExplanation || optimizedCode);
  }, [task, outExplanation, optimizedCode]);

  const docReport = useMemo(() => {
    if (task !== 'documentation') return null;
    return tryParseJsonObject(outExplanation || optimizedCode);
  }, [task, outExplanation, optimizedCode]);

  const refactorReport = useMemo(() => {
    if (task !== 'refactoring') return null;
    return tryParseJsonObject(outExplanation || optimizedCode);
  }, [task, outExplanation, optimizedCode]);

  const quickMetrics = useMemo(() => {
    if (!code) return null;
    const originalLines = (code || '').split('\n').length;
    const originalChars = (code || '').length;
    const optimizedLines = (outCode || '').split('\n').length;
    const optimizedChars = (outCode || '').length;
    const lineDelta = optimizedLines - originalLines;
    const charDelta = optimizedChars - originalChars;
    const lineReductionPct = originalLines > 0 ? Math.round(((originalLines - optimizedLines) / originalLines) * 100) : null;
    const charReductionPct = originalChars > 0 ? Math.round(((originalChars - optimizedChars) / originalChars) * 100) : null;
    return {
      originalLines,
      optimizedLines,
      lineDelta,
      lineReductionPct,
      originalChars,
      optimizedChars,
      charDelta,
      charReductionPct,
    };
  }, [code, outCode]);

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

    // Fetch supported languages from backend for strict dropdown
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/supported-languages`);
        if (!resp.ok) return;
        const data = await resp.json();
        const supported = data?.supported_languages || {};
        const popular = new Set(data?.popular_languages || []);
        const list = Object.keys(supported).map((k) => ({
          key: k,
          name: supported[k]?.name || k,
          is_popular: !!supported[k]?.is_popular || popular.has(k),
        }));
        list.sort((a, b) => (b.is_popular - a.is_popular) || a.name.localeCompare(b.name));
        if (mounted) setSupportedLanguages(list);
      } catch {}
    })();
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
    if (language === 'auto') {
      const inferred = detectLanguage(code);
      if (inferred === 'plaintext') {
        setError('Could not detect a programming language. Please select a language from the dropdown.');
        return;
      }
      effectiveLanguage = inferred;
    }

    const optimization_focus = Object.keys(optimizationFocus).filter((k) => optimizationFocus[k]);

    if (!user && optimizationCount >= 2) {
      setShowAuthModal(true);
      return;
    }

    setIsOptimizing(true);
    setError('');
    setCompareResults(null);
    setProgressStep('validating');
    setToast(null);
    
    try {
      setProgressStep('connecting');
      const response = await fetch(`${API_BASE}/analyze-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          language: effectiveLanguage,
          task: task,
          provider: aiProvider === 'auto' ? null : aiProvider,
          user_instructions: task === 'optimization' ? userInstructions : null,
          optimization_focus: task === 'optimization' ? optimization_focus : null,
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

  setProgressStep('processing');
  const result = await response.json();
  const raw = result.optimized_code || result.result || '';
  setProgressStep('rendering');
  setOptimizedCode(raw || 'No optimization result received');
  const parsed = parseAiResult(raw);
  setOutCode(parsed.code);
  setOutExplanation(parsed.explanation);
      setOptimizationCount(prev => prev + 1);
      setToast({ type: 'success', message: 'Task completed successfully!' });
      setTimeout(() => setToast(null), 4000);
      
    } catch (error) {
  console.error('Optimization failed:', error);
  setError(`Failed to optimize code: ${error.message}`);
  setToast({ type: 'error', message: `Error: ${error.message}` });
  setTimeout(() => setToast(null), 5000);
  const fallback = `# ${task} result for ${language}:\n${code}\n\n# AI Suggestions:\n# - Connection to backend failed\n# - Using demo response\n# - Please check your backend server`;
  setOptimizedCode(fallback);
  const parsed = parseAiResult(fallback);
  setOutCode(parsed.code);
  setOutExplanation(parsed.explanation);
      setOptimizationCount(prev => prev + 1);
    } finally {
      setIsOptimizing(false);
      setProgressStep('');
    }
  };

  const handleCompareModels = async () => {
    if (!code.trim()) {
      alert('Please enter some code to analyze!');
      return;
    }

    let effectiveLanguage = language;
    if (language === 'auto') {
      const inferred = detectLanguage(code);
      if (inferred === 'plaintext') {
        setError('Could not detect a programming language. Please select a language from the dropdown.');
        return;
      }
      effectiveLanguage = inferred;
    }

    const providers = Object.keys(selectedProviders).filter((k) => selectedProviders[k]);
    if (providers.length === 0) {
      setError('Select at least one provider to compare.');
      return;
    }

    const optimization_focus = Object.keys(optimizationFocus).filter((k) => optimizationFocus[k]);

    if (!user && optimizationCount >= 2) {
      setShowAuthModal(true);
      return;
    }

    setIsOptimizing(true);
    setError('');
    setCompareResults(null);
    try {
      const resp = await fetch(`${API_BASE}/analyze-code/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language: effectiveLanguage,
          task,
          providers,
          user_instructions: task === 'optimization' ? userInstructions : null,
          optimization_focus: task === 'optimization' ? optimization_focus : null,
        }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${txt}`);
      }

      const data = await resp.json();
      setCompareResults(data);
      setOptimizedCode('');
      setOutCode('');
      setOutExplanation('');
      setOptimizationCount((prev) => prev + 1);
      setToast({ type: 'success', message: 'Comparison complete!' });
      setTimeout(() => setToast(null), 4000);
    } catch (e) {
      console.error('Compare failed:', e);
      setError(`Failed to compare models: ${e.message}`);
      setToast({ type: 'error', message: `Compare error: ${e.message}` });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setIsOptimizing(false);
      setProgressStep('');
    }
  };

  const handleSaveSession = async () => {
    if (!user) { setShowAuthModal(true); return; }
    setSaving(true);
    try {
      const effectiveLangForTitle = language === 'auto' ? resolvedEditorLanguage : language;
      const payload = {
        title: `${task} • ${effectiveLangForTitle}`,
        code,
        language: effectiveLangForTitle,
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

  const handleRunCode = async () => {
    // prefer the AI-produced code if available, else run the editor code
    const toRun = outCode && outCode.trim() ? outCode : code;
    if (!toRun || !toRun.trim()) { setError('No code available to run'); return; }
    const lang = resolvedEditorLanguage || language || 'Python';
    if (lang !== 'Python') {
      setError('Run Code currently supports only Python in this build.');
      return;
    }

    setIsRunning(true);
    setRunResult(null);
    setError('');
    try {
      const resp = await fetch(`${API_BASE}/run-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: toRun, language: 'Python', stdin: '' }),
      });
      if (!resp.ok) {
        const txt = await resp.json().catch(() => ({}));
        throw new Error(txt.detail || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setRunResult(data);
    } catch (e) {
      console.error('Run failed', e);
      setError(`Run failed: ${e.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleComparePerformance = async () => {
    const original = code;
    const optimized = outCode && outCode.trim() ? outCode : '';
    if (!original || !original.trim()) { setError('No original code available to run'); return; }
    if (!optimized) { setError('No optimized code available to compare'); return; }

    const lang = resolvedEditorLanguage || language || 'Python';
    if (lang !== 'Python') {
      setError('Compare Performance currently supports only Python in this build.');
      return;
    }

    setIsComparing(true);
    setRunCompare(null);
    setError('');
    try {
      const resp = await fetch(`${API_BASE}/run-code/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_code: original, optimized_code: optimized, language: 'Python', stdin: '', timeout_ms: 5000 }),
      });
      if (!resp.ok) {
        const txt = await resp.json().catch(() => ({}));
        throw new Error(txt.detail || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setRunCompare(data);
      // Append to perfHistory (keep last 10)
      setPerfHistory((prev) => [
        { ts: Date.now(), ...data },
        ...prev.slice(0, 9),
      ]);
    } catch (e) {
      console.error('Compare run failed', e);
      setError(`Compare run failed: ${e.message}`);
    } finally {
      setIsComparing(false);
    }
  };

  const handleLoadSession = async (id) => {
    try {
      const resp = await fetch(`${API_BASE}/opt-sessions/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } });
      if (resp.ok) {
        const d = await resp.json();
        setCode(d.code || '');
        setLanguage(d.language || 'auto');
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
            >
              {/* Controls */}
              <div className="p-6 rounded-2xl backdrop-blur-xl border soft-shadow tint-blue tint-outline" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                <h2 className="text-lg font-semibold mb-4">Configuration</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-muted mb-2">Language</label>
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="select w-full" style={{padding:'10px 12px'}}>
                      <option value="auto">Auto (detect)</option>
                      {supportedLanguages.length === 0 ? (
                        <>
                          <option value="Python">Python</option>
                          <option value="JavaScript">JavaScript</option>
                          <option value="TypeScript">TypeScript</option>
                          <option value="Java">Java</option>
                          <option value="C++">C++</option>
                          <option value="Go">Go</option>
                          <option value="Rust">Rust</option>
                        </>
                      ) : (
                        supportedLanguages.map((l) => (
                          <option key={l.key} value={l.key}>{l.name}</option>
                        ))
                      )}
                    </select>
                    {language === 'auto' && (
                      <p className="mt-2 text-xs text-muted">Detected: <span style={{ color: 'var(--fg-color)' }}>{resolvedEditorLanguage}</span></p>
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

                {task === 'optimization' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-muted mb-2">User Instructions</label>
                    <textarea
                      value={userInstructions}
                      onChange={(e) => setUserInstructions(e.target.value)}
                      className="input w-full"
                      rows={3}
                      placeholder="Optional: add specific goals (e.g., keep function signature unchanged)"
                    />
                    <div className="mt-3">
                      <div className="text-sm font-medium text-muted mb-2">Optimization Focus</div>
                      <div className="grid grid-cols-2 gap-2">
                        {focusOptions.map((opt) => (
                          <label key={opt.key} className="flex items-center gap-2 text-xs text-muted select-none">
                            <input
                              type="checkbox"
                              checked={!!optimizationFocus[opt.key]}
                              onChange={(e) => setOptimizationFocus((prev) => ({ ...prev, [opt.key]: e.target.checked }))}
                              className="h-3.5 w-3.5 rounded"
                              style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-muted mb-2">AI Provider</label>
                  <select value={aiProvider} onChange={(e) => setAiProvider(e.target.value)} disabled={compareMode} className="select w-full disabled:opacity-60" style={{padding:'10px 12px'}}>
                    <option value="auto">Auto (Best Choice)</option>
                    <option value="openai">OpenAI GPT</option>
                    <option value="claude">Anthropic Claude</option>
                    <option value="gemini">Google Gemini</option>
                  </select>
                </div>

                <div className="mt-4">
                  <label className="flex items-center gap-2 text-xs text-muted select-none">
                    <input
                      type="checkbox"
                      checked={compareMode}
                      onChange={(e) => setCompareMode(e.target.checked)}
                      className="h-3.5 w-3.5 rounded"
                      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                    />
                    Compare models (side-by-side)
                  </label>

                  {compareMode && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {['openai', 'claude', 'gemini'].map((p) => (
                        <label key={p} className="flex items-center gap-2 text-xs text-muted select-none">
                          <input
                            type="checkbox"
                            checked={!!selectedProviders[p]}
                            onChange={(e) => setSelectedProviders((prev) => ({ ...prev, [p]: e.target.checked }))}
                            className="h-3.5 w-3.5 rounded"
                            style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
                          />
                          {p}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Code Input */}
              <div className="p-6 rounded-2xl backdrop-blur-xl border soft-shadow tint-rose tint-outline" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
                <h2 className="text-lg font-semibold mb-4">Your Code</h2>
                <CodeEditor value={code} onChange={setCode} language={resolvedEditorLanguage} height={320} />
                
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-start justify-between gap-3"
                    >
                      <span>{error}</span>
                      <button
                        onClick={() => setError('')}
                        className="text-red-400 hover:text-red-200 transition"
                        aria-label="Dismiss error"
                      >
                        ✕
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.button
                  onClick={compareMode ? handleCompareModels : handleOptimizeCode}
                  disabled={isOptimizing}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-teal-600 to-emerald-500 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 relative overflow-hidden group"
                >
                  {isOptimizing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    <span>{compareMode ? 'Compare Models' : (task === 'optimization' ? 'Optimize Code' : 'Run Task')}</span>
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
              <div className="p-6 rounded-2xl backdrop-blur-xl border soft-shadow tint-teal tint-outline h-full" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
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
                                    {parsed.explanation || ''}
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
                                  color: (bugReport?.summary?.total ?? 0) === 0 ? '#10b981' : 
                                         (bugReport?.summary?.Critical ?? 0) > 0 ? '#ef4444' : 
                                         (bugReport?.summary?.High ?? 0) > 0 ? '#f97316' : '#f59e0b'
                                }}>
                                  {bugReport?.summary?.total ?? 0}
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
                                    <span className="text-lg font-bold" style={{ color }}>{bugReport.summary[key] ?? 0}</span>
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
                            {(bugReport?.summary?.total ?? 0) === 0 && (
                              <div className="rounded-xl p-8 text-center" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(20, 184, 166, 0.08) 100%)', border: `1px solid rgba(16, 185, 129, 0.3)` }}>
                                <div className="text-5xl mb-4">🎉</div>
                                <h3 className="text-xl font-bold text-emerald-400 mb-2">No Issues Found!</h3>
                                <p className="text-sm text-muted">Your code passed all static analysis checks. Great job!</p>
                              </div>
                            )}
                          </>
                        )}
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
                            {professionalMode ? sanitizeProfessional(outExplanation) : outExplanation}
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-muted text-sm">No explanation provided</div>
                        )}
                        {runResult && (
                          <div className="mt-4 p-3 rounded-lg" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
                            <div className="text-sm font-medium mb-2">Run Results</div>
                            <div className="text-xs text-muted mb-2">Time: {runResult.exec_time_ms} ms • Peak: {runResult.peak_kb ?? '—'} KB</div>
                            <div className="text-sm mb-2">Stdout:</div>
                            <pre className="themed-code font-mono text-sm whitespace-pre leading-relaxed max-h-40 overflow-auto">{runResult.stdout || '(no stdout)'}</pre>
                            <div className="text-sm mt-2 mb-1">Stderr:</div>
                            <pre className="themed-code font-mono text-sm whitespace-pre leading-relaxed max-h-40 overflow-auto">{runResult.stderr || '(no stderr)'}</pre>
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
    </div>
  );
};

export default CodeOptimizer;