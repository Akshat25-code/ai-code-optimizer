import React from 'react';
import { motion } from 'framer-motion';

export default function AnalysisReportCard({ task, analysisReport }) {
  return (
    <>
                          {task === 'analysis' && (
                            <div className="space-y-6 mb-6">
                              {/* Professional Report Card Header */}
                              <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(232, 184, 75, 0.15) 0%, rgba(62, 207, 142, 0.1) 100%)', border: `1px solid var(--card-border)` }}>
                                <div className="p-6">
                                  <div className="flex items-center justify-between mb-4">
                                    <div>
                                      <h2 className="text-xl font-bold" style={{ color: 'var(--fg-color)' }}>ðŸ“Š Code Analysis Report Card</h2>
                                      <p className="text-sm text-muted mt-1">Comprehensive assessment across 7 quality dimensions</p>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-4xl font-bold" style={{
                                        color: (analysisReport?.overall_score ?? 0) >= 8 ? '#3ECF8E' :
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
                                        background: (analysisReport?.overall_score ?? 0) >= 8 ? 'linear-gradient(90deg, #3ECF8E, #E8B84B)' :
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
                                      const getScoreColor = (s) => s >= 8 ? '#3ECF8E' : s >= 6 ? '#f59e0b' : s >= 4 ? '#f97316' : '#ef4444';
                                      const getScoreBg = (s) => s >= 8 ? 'rgba(62, 207, 142, 0.15)' : s >= 6 ? 'rgba(245, 158, 11, 0.15)' : s >= 4 ? 'rgba(249, 115, 22, 0.15)' : 'rgba(239, 68, 68, 0.15)';
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
                                        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid var(--card-border)`, background: 'rgba(62, 207, 142, 0.1)' }}>
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
                                        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid var(--card-border)`, background: 'rgba(232, 184, 75, 0.1)' }}>
                                          <span>ðŸŽ¯</span>
                                          <h3 className="font-semibold text-teal-400">Action Plan</h3>
                                        </div>
                                        <div className="p-4">
                                          <ol className="space-y-2">
                                            {analysisReport.action_plan.slice(0, 5).map((action, i) => (
                                              <li key={i} className="flex items-start gap-2 text-sm">
                                                <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(232, 184, 75, 0.2)', color: '#E8B84B' }}>{i + 1}</span>
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
    </>
  );
}
