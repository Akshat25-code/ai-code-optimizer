import { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useFileManager } from '@/hooks/useFileManager';
import { API_BASE, WS_BASE } from '@/config';
import useStreamingResponse from '@/features/optimization/useStreamingResponse';

// Lightweight language detection for editor + API when 'Auto' is selected
export const detectLanguage = (text) => {
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

// Parse AI result: extract code blocks and explanation
export const parseAiResult = (text) => {
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

// Try to parse a JSON object from text (with fallback extraction)
export const tryParseJsonObject = (text) => {
  if (!text) return null;
  const s = String(text).trim();
  try { return JSON.parse(s); } catch (_e) { /* noop */ }
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return JSON.parse(s.slice(first, last + 1)); } catch (_e) { /* noop */ }
  }
  return null;
};

export const focusOptions = [
  { key: 'time_complexity', label: 'Time complexity' },
  { key: 'space_complexity', label: 'Space complexity' },
  { key: 'code_length', label: 'Code length' },
  { key: 'readability', label: 'Readability' },
  { key: 'performance', label: 'Performance' },
  { key: 'memory', label: 'Memory' },
];

let pyodideWorker = null;
let runCodeResolvers = {};
let nextRunId = 1;

function getPyWorker() {
  if (!pyodideWorker) {
    pyodideWorker = new Worker('/pyodideWorker.js');
    pyodideWorker.onmessage = (e) => {
      const { id, ...result } = e.data;
      if (runCodeResolvers[id]) {
        runCodeResolvers[id](result);
        delete runCodeResolvers[id];
      }
    };
  }
  return pyodideWorker;
}

const runPythonInBrowser = (pythonCode) => {
  return new Promise((resolve) => {
    const id = nextRunId++;
    runCodeResolvers[id] = resolve;
    getPyWorker().postMessage({ id, pythonCode });
  });
};

export default function useOptimizer({ defaultTask, enableFileManager } = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state?.prefill;
  const { user } = useAuth();

  // File manager integration (optional, for multi-file pages)
  const fileManager = useFileManager(prefill?.language || 'javascript');

  const [localCode, setLocalCode] = useState(prefill?.code || '');
  const [lastSyncedCode, setLastSyncedCode] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const socketRef = useRef(null);
  const [localLanguage, setLocalLanguage] = useState(prefill?.language || 'auto');
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [task, setTask] = useState(prefill?.task || defaultTask || 'optimization');

  // Delegate code/language to file manager when enabled
  const code = enableFileManager ? fileManager.code : localCode;
  const setCode = enableFileManager ? fileManager.setCode : setLocalCode;
  const language = enableFileManager ? fileManager.language : localLanguage;
  const setLanguage = enableFileManager ? fileManager.setLanguage : setLocalLanguage;
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
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const streaming = useStreamingResponse();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [error, setError] = useState('');
  const [backendHealthy, setBackendHealthy] = useState(null);
  const [professionalMode, setProfessionalMode] = useState(true);
  const [progressStep, setProgressStep] = useState('');
  const [toast, setToast] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runCompare, setRunCompare] = useState(null);
  const [isComparing, setIsComparing] = useState(false);
  const [verificationReport, setVerificationReport] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [perfHistory, setPerfHistory] = useState([]);
  const [inspection, setInspection] = useState(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [complexityReport, setComplexityReport] = useState(null);
  const [isAnalyzingComplexity, setIsAnalyzingComplexity] = useState(false);
  const [lastTokens, setLastTokens] = useState({ in: 0, out: 0, provider: '' });
  const [analytics, setAnalytics] = useState([]);
  const [ghModalOpen, setGhModalOpen] = useState(false);
  const [userInstructions, setUserInstructions] = useState(
    prefill?.user_instructions || 'Minimize code length while maintaining readability and performance.'
  );
  const [optimizationFocus, setOptimizationFocus] = useState({
    time_complexity: true, space_complexity: false, code_length: true,
    readability: true, performance: true, memory: false,
  });

  // WebSocket Connection
  useEffect(() => {
    if (!currentSessionId) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    const ws = new WebSocket(`${WS_BASE}/ws/session/${currentSessionId}`);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'session_update') {
        const { code: newCode, userInstructions: newInstr } = msg.data;
        if (newCode !== undefined && newCode !== code) {
          setLastSyncedCode(newCode);
          setCode(newCode);
        }
        if (newInstr !== undefined) setUserInstructions(newInstr);
      }
    };

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [currentSessionId]);

  // Sync LOCAL changes to WS
  useEffect(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      if (code !== lastSyncedCode) {
        socketRef.current.send(JSON.stringify({ code, userInstructions }));
        setLastSyncedCode(code);
      }
    }
  }, [code, userInstructions]);

  const resolvedEditorLanguage = useMemo(() => {
    return language === 'auto' ? detectLanguage(code) : language;
  }, [language, code]);

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

    // Parse complexity from AI explanation text
    let timeComplexityBefore = null;
    let timeComplexityAfter = null;
    let spaceComplexityBefore = null;
    let spaceComplexityAfter = null;

    if (outExplanation) {
      const timeMatch = outExplanation.match(/time\s*complexity[:\s]*\[?O\(([^)]+)\)\]?\s*[â†’âž”\->]+\s*\[?O\(([^)]+)\)/i);
      if (timeMatch) {
        timeComplexityBefore = `O(${timeMatch[1]})`;
        timeComplexityAfter = `O(${timeMatch[2]})`;
      } else {
        const oMatches = outExplanation.match(/O\([^)]+\)/g);
        if (oMatches && oMatches.length >= 2) {
          timeComplexityBefore = oMatches[0];
          timeComplexityAfter = oMatches[1];
        }
      }

      const spaceMatch = outExplanation.match(/space\s*complexity[:\s]*\[?O\(([^)]+)\)\]?\s*[â†’âž”\->]+\s*\[?O\(([^)]+)\)/i);
      if (spaceMatch) {
        spaceComplexityBefore = `O(${spaceMatch[1]})`;
        spaceComplexityAfter = `O(${spaceMatch[2]})`;
      }
    }

    return {
      originalLines, optimizedLines, lineDelta, lineReductionPct,
      originalChars, optimizedChars, charDelta, charReductionPct,
      timeComplexityBefore, timeComplexityAfter,
      spaceComplexityBefore, spaceComplexityAfter,
    };
  }, [code, outCode, outExplanation]);

  // Initialize: health check + supported languages
  useEffect(() => {
    if (prefill) {
      setCode(prefill.code || ''); setLanguage(prefill.language || 'python'); setTask(prefill.task || 'optimization');
    }
    let mounted = true;
    fetch(`${API_BASE}/health`).then((r) => { if (mounted) setBackendHealthy(r.ok); }).catch(() => { if (mounted) setBackendHealthy(false); });
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/supported-languages`);
        if (!resp.ok) return;
        const data = await resp.json();
        const list = Array.isArray(data)
          ? data.map((item) => ({
              key: item?.language,
              name: item?.metadata?.name || item?.language,
              is_popular: !!item?.metadata?.is_popular,
            }))
          : (() => {
              const supported = data?.supported_languages || {};
              const popular = new Set(data?.popular_languages || []);
              return Object.keys(supported).map((k) => ({
                key: k,
                name: supported[k]?.name || k,
                is_popular: !!supported[k]?.is_popular || popular.has(k),
              }));
            })();
        list.sort((a, b) => (b.is_popular - a.is_popular) || a.name.localeCompare(b.name));
        if (mounted) setSupportedLanguages(list);
      } catch (_e) { /* language fetch failed â€” keep current list */ }
    })();
    return () => { mounted = false; };
  }, [prefill]);

  // Load sessions when user logs in
  useEffect(() => {
    if (!user) { setSessions([]); return; }
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/opt-sessions`, { credentials: 'include' });
        if (resp.ok) setSessions(await resp.json());
      } catch (_e) { /* session fetch failed â€” proceed without sessions */ }
    })();
  }, [user]);

  const fetchLocalInspection = async (sourceCode = code, sourceLanguage = resolvedEditorLanguage, candidateCode = '') => {
    if (!sourceCode || !sourceCode.trim()) return null;
    setIsInspecting(true);
    try {
      const body = {
        code: sourceCode,
        language: sourceLanguage || 'Python',
      };
      if (candidateCode && candidateCode.trim()) {
        body.optimized_code = candidateCode;
      }
      const resp = await fetch(`${API_BASE}/inspect-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      setInspection(data);
      return data;
    } catch (e) {
      console.warn('Local inspection failed', e);
      return null;
    } finally {
      setIsInspecting(false);
    }
  };

  const fetchComplexityAnalysis = async (sourceCode = code, sourceLanguage = resolvedEditorLanguage, candidateCode = '') => {
    if (!sourceCode || !sourceCode.trim()) return null;
    setIsAnalyzingComplexity(true);
    try {
      const body = { code: sourceCode, language: sourceLanguage || 'Python' };
      if (candidateCode && candidateCode.trim()) {
        body.optimized_code = candidateCode;
      }
      const resp = await fetch(`${API_BASE}/analysis/complexity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      setComplexityReport(data);
      return data;
    } catch (e) {
      console.warn('Complexity analysis failed', e);
      return null;
    } finally {
      setIsAnalyzingComplexity(false);
    }
  };

  const handleDownloadInspectionReport = async () => {
    if (!code || !code.trim()) {
      setError('No code available for a proof report');
      return;
    }
    const effectiveLanguage = language === 'auto' ? resolvedEditorLanguage : language;
    try {
      const resp = await fetch(`${API_BASE}/inspect-code/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: 'AI Code Optimizer Proof Report',
          code,
          language: effectiveLanguage || 'Python',
          optimized_code: outCode && outCode.trim() ? outCode : null,
        }),
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'code_quality_proof_report.md';
      a.click();
      URL.revokeObjectURL(url);
      setToast({ type: 'success', message: 'Proof report exported.' });
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      setError(`Report export failed: ${e.message}`);
      setToast({ type: 'error', message: `Report export failed: ${e.message}` });
      setTimeout(() => setToast(null), 5000);
    }
  };

  const handleOptimizeCode = async () => {
    if (task === 'analytics') {
      await fetchAnalytics();
      return;
    }
    if (!code.trim()) { alert('Please enter some code to optimize!'); return; }
    let effectiveLanguage = language;
    if (language === 'auto') {
      const inferred = detectLanguage(code);
      if (inferred === 'plaintext') { setError('Could not detect a programming language. Please select a language from the dropdown.'); return; }
      effectiveLanguage = inferred;
    }
    const optimization_focus = Object.keys(optimizationFocus).filter((k) => optimizationFocus[k]);
    if (!user && optimizationCount >= 2) { setShowAuthModal(true); return; }

    setIsOptimizing(true); setError(''); setCompareResults(null); setProgressStep('validating'); setToast(null);
    try {
      setProgressStep('inspecting');
      await Promise.all([
        fetchLocalInspection(code, effectiveLanguage),
        fetchComplexityAnalysis(code, effectiveLanguage),
      ]);
      setProgressStep('connecting');

      // Streaming path: live chunks render as they arrive
      if (streamingEnabled && ['optimization', 'explanation', 'debugging'].includes(task)) {
        setProgressStep('streaming');
        await new Promise((resolve, reject) => {
          streaming.startStream({
            code,
            language: effectiveLanguage,
            task,
            provider: aiProvider,
            userInstructions: task === 'optimization' ? userInstructions : null,
            optimizationFocus: task === 'optimization' ? optimization_focus : null,
            onDone: async ({ fullText, optimizedCode: streamedCode, stats }) => {
              try {
                setOptimizedCode(fullText || 'No optimization result received');
                setLastTokens({ in: 0, out: stats.tokensOut, provider: streaming.streamProvider || 'stream', fromCache: stats.fromCache });
                const parsed = parseAiResult(fullText);
                const candidateCode = parsed.code || streamedCode || code;
                setOutCode(candidateCode);
                setOutExplanation(parsed.explanation || 'No detailed explanation provided by the AI.');
                await Promise.all([
                  fetchLocalInspection(code, effectiveLanguage, candidateCode),
                  fetchComplexityAnalysis(code, effectiveLanguage, candidateCode),
                ]);
                setOptimizationCount((prev) => prev + 1);
                setToast({
                  type: 'success',
                  message: stats.fromCache
                    ? 'Instant result from cache!'
                    : `Streamed ${stats.tokensOut} tokens at ${stats.tokensPerSec}/sec`,
                });
                setTimeout(() => setToast(null), 4000);
                resolve();
              } catch (err) { reject(err); }
            },
          }).then((text) => {
            // Stream ended without done event (error path) â€” surface it
            if (!text) reject(new Error(streaming.streamError || 'Stream ended unexpectedly'));
          }).catch(reject);
        });
        return;
      }

      const response = await fetch(`${API_BASE}/analyze-code`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code, language: effectiveLanguage, task, provider: aiProvider === 'auto' ? null : aiProvider,
          user_instructions: task === 'optimization' ? userInstructions : null,
          optimization_focus: task === 'optimization' ? optimization_focus : null,
        }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      setProgressStep('processing');
      const result = await response.json();
      const rawText = result.result_text
        || (typeof result.result === 'string' ? result.result : result.result?.analysis)
        || '';
      const backendCode = result.optimized_code
        || (typeof result.result === 'object' ? result.result?.optimized_code : '')
        || '';
      const raw = rawText || backendCode;
      setProgressStep('rendering');
      setOptimizedCode(raw || 'No optimization result received');
      setLastTokens({ in: result.tokens_in || 0, out: result.tokens_out || 0, provider: result.provider_used });
      const parsed = parseAiResult(raw);
      const candidateCode = parsed.code || backendCode || code;
      setOutCode(candidateCode);
      setOutExplanation(parsed.explanation || 'No detailed explanation provided by the AI.');
      await Promise.all([
        fetchLocalInspection(code, effectiveLanguage, candidateCode),
        fetchComplexityAnalysis(code, effectiveLanguage, candidateCode),
      ]);
      setOptimizationCount((prev) => prev + 1);
      setToast({ type: 'success', message: 'Task completed successfully!' });
      setTimeout(() => setToast(null), 4000);
    } catch (error) {
      console.error('Optimization failed:', error);
      setError(`Failed to optimize code: ${error.message}`);
      setToast({ type: 'error', message: `Error: ${error.message}` });
      setTimeout(() => setToast(null), 5000);
      setOptimizedCode('');
      setOutCode('');
      setOutExplanation('');
    } finally {
      setIsOptimizing(false); setProgressStep('');
    }
  };

  const handleCompareModels = async () => {
    if (!code.trim()) { alert('Please enter some code to analyze!'); return; }
    let effectiveLanguage = language;
    if (language === 'auto') {
      const inferred = detectLanguage(code);
      if (inferred === 'plaintext') { setError('Could not detect a programming language.'); return; }
      effectiveLanguage = inferred;
    }
    const providers = Object.keys(selectedProviders).filter((k) => selectedProviders[k]);
    if (providers.length === 0) { setError('Select at least one provider to compare.'); return; }
    const optimization_focus = Object.keys(optimizationFocus).filter((k) => optimizationFocus[k]);
    if (!user && optimizationCount >= 2) { setShowAuthModal(true); return; }

    setIsOptimizing(true); setError(''); setCompareResults(null);
    try {
      setProgressStep('inspecting');
      await Promise.all([
        fetchLocalInspection(code, effectiveLanguage),
        fetchComplexityAnalysis(code, effectiveLanguage),
      ]);
      setProgressStep('connecting');
      const resp = await fetch(`${API_BASE}/analyze-code/compare`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code, language: effectiveLanguage, task, providers,
          user_instructions: task === 'optimization' ? userInstructions : null,
          optimization_focus: task === 'optimization' ? optimization_focus : null,
        }),
      });
      if (!resp.ok) { const txt = await resp.text(); throw new Error(`HTTP ${resp.status}: ${txt}`); }
      const data = await resp.json();
      setCompareResults(data); setOptimizedCode(''); setOutCode(''); setOutExplanation('');
      setOptimizationCount((prev) => prev + 1);
      setToast({ type: 'success', message: 'Comparison complete!' });
      setTimeout(() => setToast(null), 4000);
    } catch (e) {
      console.error('Compare failed:', e);
      setError(`Failed to compare models: ${e.message}`);
      setToast({ type: 'error', message: `Compare error: ${e.message}` });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setIsOptimizing(false); setProgressStep('');
    }
  };

  const handleSaveSession = async () => {
    if (!user) { setShowAuthModal(true); return; }
    setSaving(true);
    try {
      const effectiveLangForTitle = language === 'auto' ? resolvedEditorLanguage : language;
      const resp = await fetch(`${API_BASE}/opt-sessions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${task} â€¢ ${effectiveLangForTitle}`,
          code,
          language: effectiveLangForTitle,
          task,
          provider_used: aiProvider === 'auto' ? lastTokens.provider : aiProvider,
          result: optimizedCode || outCode || '',
          tokens_in: lastTokens.in,
          tokens_out: lastTokens.out
        }),
      });
      if (resp.ok) {
        const item = await resp.json();
        setSessions((prev) => [item, ...prev]);
        setCurrentSessionId(item.id || item._id);
        setToast({ type: 'success', message: 'Session saved and collaboration active!' });
        setTimeout(() => setToast(null), 3000);
      }
    } finally { setSaving(false); }
  };

  const handleRunCode = async () => {
    const toRun = outCode && outCode.trim() ? outCode : code;
    if (!toRun || !toRun.trim()) { setError('No code available to run'); return; }
    const lang = resolvedEditorLanguage || language || 'Python';
    if (lang !== 'Python') { setError('Run Code currently supports only Python in this build.'); return; }
    setIsRunning(true); setRunResult(null); setError('');
    try {
      const result = await runPythonInBrowser(toRun);
      if (!result.ok && result.error) {
         setRunResult({ ok: false, stdout: result.stdout || '', stderr: result.error, exec_time_ms: result.exec_time_ms || 0 });
      } else {
         setRunResult({ ok: true, stdout: result.stdout || '', stderr: '', exec_time_ms: result.exec_time_ms || 0 });
      }
    } catch (e) {
      console.error('Run failed', e); setError(`Run failed: ${e.message}`);
    } finally { setIsRunning(false); }
  };

  const handleAutoFix = async () => {
    if (!runResult || runResult.ok || !runResult.stderr) return;
    const toFix = outCode && outCode.trim() ? outCode : code;
    const lang = resolvedEditorLanguage || language || 'Python';

    setIsOptimizing(true); setError(''); setProgressStep('connecting'); setToast(null);
    try {
      const response = await fetch(`${API_BASE}/analyze-code`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: toFix, language: lang, task: 'auto_fix', provider: aiProvider === 'auto' ? null : aiProvider,
          user_instructions: runResult.stderr,
          optimization_focus: null,
        }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      setProgressStep('processing');
      const result = await response.json();
      const raw = result.optimized_code
        || (typeof result.result === 'string' ? result.result : result.result?.optimized_code || result.result?.analysis)
        || result.result_text
        || '';

      const parsedFn = (text) => {
        const parts = parseAiResult(text);
        if (parts.code) return parts.code;
        return text.replace(/```[a-zA-Z]*\n?([^]*?)```/g, "$1").trim();
      };
      const cleaned = parsedFn(raw);

      setProgressStep('rendering');
      if (outCode && outCode.trim()) {
        setOutCode(cleaned);
        setOptimizedCode(cleaned);
      } else {
        setCode(cleaned);
      }
      setRunResult(null);
      setToast({ type: 'success', message: 'Auto-Fix applied successfully! Click Run again.' });
      setTimeout(() => setToast(null), 4000);
    } catch (e) {
      setError(`Auto-Fix failed: ${e.message}`);
      setToast({ type: 'error', message: `Error: ${e.message}` });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setIsOptimizing(false); setProgressStep('');
    }
  };

  const handleComparePerformance = async () => {
    const original = code; const optimized = outCode && outCode.trim() ? outCode : '';
    if (!original || !original.trim()) { setError('No original code available to run'); return; }
    if (!optimized) { setError('No optimized code available to compare'); return; }
    const lang = resolvedEditorLanguage || language || 'Python';
    if (lang !== 'Python') { setError('Compare Performance currently supports only Python in this build.'); return; }
    setIsComparing(true); setRunCompare(null); setError('');
    try {
      const resOriginal = await runPythonInBrowser(original);
      const resOptimized = await runPythonInBrowser(optimized);

      const speed_pct = resOriginal.exec_time_ms > 0 ? Math.round(((resOriginal.exec_time_ms - resOptimized.exec_time_ms) / resOriginal.exec_time_ms) * 100) : null;

      const data = {
        original: { ok: resOriginal.ok, stdout: resOriginal.stdout, stderr: resOriginal.error || '', exec_time_ms: resOriginal.exec_time_ms, memory_mb: 0 },
        optimized: { ok: resOptimized.ok, stdout: resOptimized.stdout, stderr: resOptimized.error || '', exec_time_ms: resOptimized.exec_time_ms, memory_mb: 0 },
        output_match: resOriginal.ok && resOptimized.ok && resOriginal.stdout === resOptimized.stdout,
        speed_improvement_pct: speed_pct,
        memory_improvement_pct: null
      };

      setRunCompare(data);
      setPerfHistory((prev) => [{ ts: Date.now(), ...data }, ...prev.slice(0, 9)]);
    } catch (e) {
      console.error('Compare run failed', e); setError(`Compare run failed: ${e.message}`);
    } finally { setIsComparing(false); }
  };

  const handleVerifyOptimization = async () => {
    const original = code;
    const optimized = outCode && outCode.trim() ? outCode : '';
    if (!original || !original.trim()) { setError('No original code available to verify'); return; }
    if (!optimized) { setError('No optimized code available to verify'); return; }
    const effectiveLanguage = language === 'auto' ? resolvedEditorLanguage : language;
    setIsVerifying(true);
    setVerificationReport(null);
    setError('');
    try {
      const resp = await fetch(`${API_BASE}/intelligence/verify-optimization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: original,
          optimized_code: optimized,
          language: effectiveLanguage || 'Python',
          skip_ai: true,
          timeout_ms: 5000,
        }),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setVerificationReport(data);
      setToast({ type: data.verified ? 'success' : 'error', message: data.status || 'Verification complete' });
      setTimeout(() => setToast(null), 4000);
    } catch (e) {
      setError(`Verification failed: ${e.message}`);
      setToast({ type: 'error', message: `Verification failed: ${e.message}` });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLoadSession = async (id) => {
    try {
      const resp = await fetch(`${API_BASE}/opt-sessions/${id}`, { credentials: 'include' });
      if (resp.ok) {
        const d = await resp.json();
        setCode(d.code || ''); setLanguage(d.language || 'auto'); setTask(d.task || 'optimization');
        const parsed = parseAiResult(d.result || '');
        setOptimizedCode(d.result || ''); setOutCode(parsed.code); setOutExplanation(parsed.explanation);
        setCurrentSessionId(id);
        setToast({ type: 'success', message: 'Session loaded. Live collaboration active!' });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (_e) { /* session load failed */ }
  };

  const handleDeleteSession = async (id) => {
    try {
      const resp = await fetch(`${API_BASE}/opt-sessions/${id}`, { method: 'DELETE', credentials: 'include' });
      if (resp.status === 204) setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (_e) { /* session delete failed */ }
  };

  const fetchAnalytics = async () => {
    if (!user) return;
    try {
      const resp = await fetch(`${API_BASE}/opt-sessions/analytics/stats`, {
        credentials: 'include'
      });
      if (resp.ok) setAnalytics(await resp.json());
    } catch (_e) { /* analytics fetch failed */ }
  };


  return {
    // State
    code, setCode, language, setLanguage, supportedLanguages, task, setTask,
    aiProvider, setAiProvider, compareMode, setCompareMode,
    selectedProviders, setSelectedProviders, optimizedCode, outCode, outExplanation,
    compareResults, copied, setCopied, isOptimizing, optimizationCount,
    showAuthModal, setShowAuthModal, error, setError, backendHealthy,
    professionalMode, setProfessionalMode, progressStep, toast, setToast,
    sessions, saving, runResult, isRunning, runCompare, setRunCompare, isComparing,
    verificationReport, isVerifying, perfHistory,
    lastTokens, analytics, fetchAnalytics, ghModalOpen, setGhModalOpen, currentSessionId,
    inspection, isInspecting, fetchLocalInspection,
    complexityReport, isAnalyzingComplexity, fetchComplexityAnalysis,
    streaming, streamingEnabled, setStreamingEnabled,
    userInstructions, setUserInstructions, optimizationFocus, setOptimizationFocus,
    resolvedEditorLanguage, analysisReport, bugReport, docReport, refactorReport, quickMetrics,
    setOptimizedCode, setOutCode, setOutExplanation,
    user, navigate,
    // Handlers
    handleOptimizeCode, handleCompareModels, handleSaveSession,
    handleRunCode, handleAutoFix, handleComparePerformance, handleLoadSession, handleDeleteSession,
    handleDownloadInspectionReport, handleVerifyOptimization,
    // File Manager (available when enableFileManager=true)
    ...(enableFileManager && {
      files: fileManager.files,
      activeFile: fileManager.activeFile,
      activeFileId: fileManager.activeFileId,
      explorerCollapsed: fileManager.explorerCollapsed,
      createFile: fileManager.createFile,
      importFile: fileManager.importFile,
      deleteFile: fileManager.deleteFile,
      renameFile: fileManager.renameFile,
      selectFile: fileManager.selectFile,
      toggleExplorerCollapse: fileManager.toggleExplorerCollapse,
      downloadActiveFile: fileManager.downloadActiveFile,
    }),
  };
}

