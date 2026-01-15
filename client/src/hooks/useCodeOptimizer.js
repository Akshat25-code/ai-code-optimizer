import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE } from '../config';
import { useFileManager } from './useFileManager';

// Lightweight language detection
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

// Parse AI result into code and explanation
const parseAiResult = (raw) => {
  if (!raw) return { code: '', explanation: '' };
  const fenceMatch = raw.match(/```[\w]*\n([\s\S]*?)```/);
  if (fenceMatch) {
    const code = fenceMatch[1].trim();
    const explanation = raw.replace(fenceMatch[0], '').trim();
    return { code, explanation };
  }
  return { code: '', explanation: raw };
};

// Try to extract JSON object from string
const tryParseJsonObject = (s) => {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {}
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

export const useCodeOptimizer = (defaultTask = 'optimization', enableFileManager = false) => {
  const location = useLocation();
  const prefill = location.state?.prefill;
  const { user } = useAuth();
  
  // File manager hook (optional)
  const fileManager = useFileManager(prefill?.language || 'javascript');
  
  // Core state - use file manager if enabled, otherwise local state
  const [localCode, setLocalCode] = useState(prefill?.code || '');
  const [localLanguage, setLocalLanguage] = useState(prefill?.language || 'auto');
  
  // Derived code and language based on file manager
  const code = enableFileManager ? fileManager.code : localCode;
  const setCode = enableFileManager ? fileManager.setCode : setLocalCode;
  const language = enableFileManager ? fileManager.language : localLanguage;
  const setLanguage = enableFileManager ? fileManager.setLanguage : setLocalLanguage;
  
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [task] = useState(defaultTask);
  const [aiProvider, setAiProvider] = useState('auto');
  
  // Result state
  const [optimizedCode, setOptimizedCode] = useState('');
  const [outCode, setOutCode] = useState('');
  const [outExplanation, setOutExplanation] = useState('');
  
  // UI state
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState('');
  const [backendHealthy, setBackendHealthy] = useState(null);
  const [progressStep, setProgressStep] = useState('');
  const [toast, setToast] = useState(null);
  const [optimizationCount, setOptimizationCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Optimization-specific state
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

  // Run/compare state
  const [runResult, setRunResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runCompare, setRunCompare] = useState(null);
  const [isComparing, setIsComparing] = useState(false);

  // Computed values
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
    
    // Parse complexity from explanation
    let timeComplexityBefore = null;
    let timeComplexityAfter = null;
    let spaceComplexityBefore = null;
    let spaceComplexityAfter = null;
    
    if (outExplanation) {
      // Try to extract time complexity: "O(n²) → O(n)" or "Time Complexity: O(n) → O(1)"
      const timeMatch = outExplanation.match(/time\s*complexity[:\s]*\[?O\(([^)]+)\)\]?\s*[→➔\->]+\s*\[?O\(([^)]+)\)/i);
      if (timeMatch) {
        timeComplexityBefore = `O(${timeMatch[1]})`;
        timeComplexityAfter = `O(${timeMatch[2]})`;
      } else {
        // Fallback: look for any O(...) patterns
        const oMatches = outExplanation.match(/O\([^)]+\)/g);
        if (oMatches && oMatches.length >= 2) {
          timeComplexityBefore = oMatches[0];
          timeComplexityAfter = oMatches[1];
        }
      }
      
      // Try to extract space complexity
      const spaceMatch = outExplanation.match(/space\s*complexity[:\s]*\[?O\(([^)]+)\)\]?\s*[→➔\->]+\s*\[?O\(([^)]+)\)/i);
      if (spaceMatch) {
        spaceComplexityBefore = `O(${spaceMatch[1]})`;
        spaceComplexityAfter = `O(${spaceMatch[2]})`;
      } else if (!timeMatch) {
        // Use remaining O(...) matches for space if we found some
        const oMatches = outExplanation.match(/O\([^)]+\)/g);
        if (oMatches && oMatches.length >= 4) {
          spaceComplexityBefore = oMatches[2];
          spaceComplexityAfter = oMatches[3];
        }
      }
    }
    
    return {
      originalLines,
      optimizedLines,
      lineDelta,
      lineReductionPct,
      originalChars,
      optimizedChars,
      charDelta,
      charReductionPct,
      timeComplexityBefore,
      timeComplexityAfter,
      spaceComplexityBefore,
      spaceComplexityAfter,
    };
  }, [code, outCode, outExplanation]);

  // Initialize
  useEffect(() => {
    if (prefill) {
      setCode(prefill.code || '');
      setLanguage(prefill.language || 'python');
    }

    let mounted = true;
    fetch(`${API_BASE}/health`).then(async (r) => {
      if (!mounted) return;
      setBackendHealthy(r.ok);
    }).catch(() => {
      if (!mounted) return;
      setBackendHealthy(false);
    });

    // Fetch supported languages
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

  // Main handler
  const handleProcess = useCallback(async () => {
    if (!code.trim()) {
      setError('Please enter some code to process!');
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
    setProgressStep('validating');
    setToast(null);
    
    try {
      setProgressStep('connecting');
      const response = await fetch(`${API_BASE}/analyze-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setOptimizedCode(raw || 'No result received');
      const parsed = parseAiResult(raw);
      setOutCode(parsed.code);
      setOutExplanation(parsed.explanation);
      setOptimizationCount(prev => prev + 1);
      setToast({ type: 'success', message: 'Task completed successfully!' });
      setTimeout(() => setToast(null), 4000);
      
    } catch (error) {
      console.error('Processing failed:', error);
      setError(`Failed to process code: ${error.message}`);
      setToast({ type: 'error', message: `Error: ${error.message}` });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setIsOptimizing(false);
      setProgressStep('');
    }
  }, [code, language, task, aiProvider, userInstructions, optimizationFocus, user, optimizationCount]);

  // Run code handler
  const handleRunCode = useCallback(async () => {
    if (!code.trim()) return;
    setIsRunning(true);
    setRunResult(null);
    
    // Determine the language to use
    let runLanguage = language;
    if (language === 'auto') {
      runLanguage = detectLanguage(code);
    }
    // Capitalize first letter for backend (Python, Javascript, etc)
    const capitalizedLang = runLanguage.charAt(0).toUpperCase() + runLanguage.slice(1).toLowerCase();
    
    try {
      const resp = await fetch(`${API_BASE}/run-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: outCode || code, // Run optimized code if available, else original
          language: capitalizedLang,
          timeout_ms: 5000
        }),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setRunResult(data);
      if (data.ok) {
        setToast({ type: 'success', message: '✅ Code executed successfully!' });
        setTimeout(() => setToast(null), 3000);
      }
    } catch (e) {
      setError(`Run failed: ${e.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [code, outCode, language, setToast]);

  // Compare performance handler
  const handleComparePerformance = useCallback(async () => {
    if (!code.trim() || !outCode.trim()) return;
    setIsComparing(true);
    setRunCompare(null);
    
    // Determine the language to use
    let runLanguage = language;
    if (language === 'auto') {
      runLanguage = detectLanguage(code);
    }
    // Capitalize first letter for backend (Python, Javascript, etc)
    const capitalizedLang = runLanguage.charAt(0).toUpperCase() + runLanguage.slice(1).toLowerCase();
    
    try {
      const resp = await fetch(`${API_BASE}/run-code/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_code: code,
          optimized_code: outCode,
          language: capitalizedLang,
          timeout_ms: 5000
        }),
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setRunCompare(data);
      setToast({ type: 'success', message: '✅ Performance comparison complete!' });
      setTimeout(() => setToast(null), 3000);
    } catch (e) {
      setError(`Compare failed: ${e.message}`);
    } finally {
      setIsComparing(false);
    }
  }, [code, outCode, language, setToast]);

  // Clear results
  const handleClear = useCallback(() => {
    setOptimizedCode('');
    setOutCode('');
    setOutExplanation('');
    setError('');
    setRunResult(null);
    setRunCompare(null);
  }, []);

  return {
    // State
    code, setCode,
    language, setLanguage,
    supportedLanguages,
    task,
    aiProvider, setAiProvider,
    optimizedCode,
    outCode,
    outExplanation,
    isOptimizing,
    error, setError,
    backendHealthy,
    progressStep,
    toast, setToast,
    showAuthModal, setShowAuthModal,
    userInstructions, setUserInstructions,
    optimizationFocus, setOptimizationFocus,
    runResult,
    isRunning,
    runCompare,
    isComparing,
    
    // Computed
    resolvedEditorLanguage,
    analysisReport,
    bugReport,
    docReport,
    refactorReport,
    quickMetrics,
    user,
    
    // Handlers
    handleProcess,
    handleRunCode,
    handleComparePerformance,
    handleClear,
    detectLanguage,
    
    // File Manager (when enabled)
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
};

export default useCodeOptimizer;
