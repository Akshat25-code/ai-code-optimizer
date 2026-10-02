import React from 'react';

export default function DocRefactorReports({ task, docReport, refactorReport }) {
  return (
    <>
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
    </>
  );
}
