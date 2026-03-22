import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CodeEditor from '../CodeEditor';
import { focusOptions } from './useOptimizer';

const ConfigPanel = ({
    language, setLanguage, supportedLanguages, resolvedEditorLanguage,
    task, setTask, aiProvider, setAiProvider, compareMode, setCompareMode,
    selectedProviders, setSelectedProviders,
    userInstructions, setUserInstructions, optimizationFocus, setOptimizationFocus,
    setGhModalOpen
}) => (
    <div className="p-6 rounded-2xl backdrop-blur-xl border soft-shadow tint-blue tint-outline" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Configuration</h2>
            <button 
                onClick={() => setGhModalOpen(true)}
                className="text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition"
            >
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]" />
                Browse Repositories
            </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
                <label className="block text-sm font-medium text-muted mb-2">Language</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="select w-full" style={{ padding: '10px 12px' }}>
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
                        supportedLanguages.map((l) => <option key={l.key} value={l.key}>{l.name}</option>)
                    )}
                </select>
                {language === 'auto' && (
                    <p className="mt-2 text-xs text-muted">Detected: <span style={{ color: 'var(--fg-color)' }}>{resolvedEditorLanguage}</span></p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-muted mb-2">Task</label>
                <select value={task} onChange={(e) => setTask(e.target.value)} className="select w-full" style={{ padding: '10px 12px' }}>
                    <option value="optimization">Optimize</option>
                    <option value="analysis">Analyze</option>
                    <option value="bug_detection">Bug Detection</option>
                    <option value="explanation">Explain</option>
                    <option value="debugging">Debugging</option>
                    <option value="documentation">Document</option>
                    <option value="refactoring">Refactor</option>
                    <option value="analytics">Usage Analytics</option>
                </select>
            </div>
        </div>

        {task === 'optimization' && (
            <div className="mb-4">
                <label className="block text-sm font-medium text-muted mb-2">User Instructions</label>
                <textarea
                    value={userInstructions} onChange={(e) => setUserInstructions(e.target.value)}
                    className="input w-full" rows={3}
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
            <select value={aiProvider} onChange={(e) => setAiProvider(e.target.value)} disabled={compareMode} className="select w-full disabled:opacity-60" style={{ padding: '10px 12px' }}>
                <option value="auto">Auto (Best Choice)</option>
                <option value="openai">OpenAI GPT</option>
                <option value="claude">Anthropic Claude</option>
                <option value="gemini">Google Gemini</option>
            </select>
        </div>

        <div className="mt-4">
            <label className="flex items-center gap-2 text-xs text-muted select-none">
                <input type="checkbox" checked={compareMode} onChange={(e) => setCompareMode(e.target.checked)} className="h-3.5 w-3.5 rounded" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }} />
                Compare models (side-by-side)
            </label>
            {compareMode && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                    {['openai', 'claude', 'gemini'].map((p) => (
                        <label key={p} className="flex items-center gap-2 text-xs text-muted select-none">
                            <input type="checkbox" checked={!!selectedProviders[p]} onChange={(e) => setSelectedProviders((prev) => ({ ...prev, [p]: e.target.checked }))} className="h-3.5 w-3.5 rounded" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }} />
                            {p}
                        </label>
                    ))}
                </div>
            )}
        </div>
    </div>
);

export const CodeInputPanel = ({ code, setCode, resolvedEditorLanguage, error, setError, isOptimizing, compareMode, task, onSubmit }) => (
    <div className="p-6 rounded-2xl backdrop-blur-xl border soft-shadow tint-rose tint-outline" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
        <h2 className="text-lg font-semibold mb-4">Your Code</h2>
        <CodeEditor value={code} onChange={setCode} language={resolvedEditorLanguage} height={320} />

        <AnimatePresence>
            {error && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-start justify-between gap-3"
                >
                    <span>{error}</span>
                    <button onClick={() => setError('')} className="text-red-400 hover:text-red-200 transition" aria-label="Dismiss error">✕</button>
                </motion.div>
            )}
        </AnimatePresence>

        <motion.button
            onClick={onSubmit} disabled={isOptimizing}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
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
                <span>{compareMode ? 'Compare Models' : (task === 'analytics' ? 'View Analytics' : (task === 'optimization' ? 'Optimize Code' : 'Run Task'))}</span>
            )}
        </motion.button>
    </div>
);

export default ConfigPanel;
