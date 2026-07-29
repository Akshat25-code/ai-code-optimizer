import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CodeEditor from '@/components/editor/CodeEditor';
import { apiClient } from '@/services/apiClient';

const TestGenerator = ({ sourceCode, language, aiProvider }) => {
  const [testCode, setTestCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!sourceCode.trim()) {
      setError("Please provide source code in the main editor first.");
      return;
    }
    setError(null);
    setIsGenerating(true);
    setTestCode('');
    setTestResults(null);
    try {
      const res = await apiClient.generateTests({
        code: sourceCode,
        language,
        provider: aiProvider
      });
      setTestCode(res.test_code || '');
    } catch (err) {
      setError(err.message || 'Failed to generate tests');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRun = async () => {
    if (!testCode.trim()) {
      setError("No test code to run!");
      return;
    }
    setError(null);
    setIsRunning(true);
    setTestResults(null);
    try {
      const res = await apiClient.runTests(sourceCode, testCode);
      setTestResults(res);
    } catch (err) {
      setError(err.message || 'Failed to run tests');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="card fade-in h-full flex flex-col min-h-[600px]">
      <div className="p-4 border-b border-[var(--card-border)] flex items-center justify-between bg-[var(--surface-1)]">
        <div>
          <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
            AI Test Studio
          </h3>
          <p className="text-xs text-muted">Generate and run tests securely.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isRunning || !sourceCode}
            className="btn-secondary flex items-center gap-2 px-3 py-1.5"
          >
            {isGenerating ? (
              <svg className="animate-spin w-4 h-4 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            )}
            Generate
          </button>
          <button
            onClick={handleRun}
            disabled={isGenerating || isRunning || !testCode}
            className="btn-primary flex items-center gap-2 px-3 py-1.5"
          >
            {isRunning ? (
              <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            Run Tests
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 flex flex-col p-4 gap-4">
        {/* Editor Area */}
        <div className="flex-1 rounded-xl overflow-hidden border border-[var(--card-border)] bg-[var(--code-bg)] min-h-[300px]">
          <CodeEditor
            code={testCode}
            onChange={setTestCode}
            language={language}
            placeholder={isGenerating ? "AI is writing tests..." : "Test code will appear here. You can edit it directly."}
            readOnly={isGenerating || isRunning}
          />
        </div>

        {/* Results Area */}
        <AnimatePresence>
          {testResults && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`rounded-xl border p-4 ${testResults.passed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                {testResults.passed ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                    Tests Passed
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-400 font-bold">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                    Tests Failed
                  </span>
                )}
              </div>
              <pre className="text-xs font-mono text-[var(--code-fg)] whitespace-pre-wrap max-h-48 overflow-y-auto p-2 bg-[#00000030] rounded">
                {testResults.output}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TestGenerator;

