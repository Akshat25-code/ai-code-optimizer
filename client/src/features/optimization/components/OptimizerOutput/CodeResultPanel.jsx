import React from 'react';

export default function CodeResultPanel({ task, outCode, copied, handleRunCode, isRunning, handleComparePerformance, isComparing, quickMetrics, runCompare, perfHistory, outExplanation, professionalMode, sanitizeProfessional, cleanExplanationText, runResult, handleAutoFix, isOptimizing }) {
  return (
    <>
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
  );
}
