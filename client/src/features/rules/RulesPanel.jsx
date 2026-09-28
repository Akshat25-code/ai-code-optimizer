import React, { useState } from 'react';
import RulesManager from './RulesManager';
import ViolationsPanel from './ViolationsPanel';
import { apiClient } from '@/services/apiClient';

/**
 * Wired rules loop: pack manager + evaluate-open-code + violations.
 * "Evaluate" runs the user's saved active packs against the given code.
 */
export default function RulesPanel({ code, language = 'python' }) {
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const evaluate = async () => {
    if (!code?.trim() || running) return;
    setRunning(true);
    setError('');
    try {
      const [packs, saved] = await Promise.all([
        apiClient.getRulePacks(),
        apiClient.getUserRules().catch(() => ({ active_packs: [] })),
      ]);
      const active = saved.active_packs?.length ? saved.active_packs : Object.keys(packs);
      const rules = active.flatMap((p) => packs[p] || []);
      const data = await apiClient.evaluateRules(code, language, rules);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Evaluation failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <RulesManager />
      <div>
        <button
          type="button"
          onClick={evaluate}
          disabled={running || !code?.trim()}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50"
        >
          {running ? 'Evaluating…' : 'Evaluate open code'}
        </button>
      </div>
      {error && (
        <div role="alert" className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}
      {result && (
        <ViolationsPanel
          violations={result.violations || []}
          complianceScore={result.compliance_score ?? 100}
        />
      )}
    </div>
  );
}
