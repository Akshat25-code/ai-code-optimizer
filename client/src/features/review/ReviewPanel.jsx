import React, { useState } from 'react';
import PipelineView from './PipelineView';
import FindingsPanel from './FindingsPanel';
import { apiClient } from '@/services/apiClient';

/**
 * Wired review pipeline: stage stepper + live run + ranked findings.
 * Quick = local stages only (skip_ai), Deep = all stages incl. AI.
 */
export default function ReviewPanel({ code, language = 'python' }) {
  const [stageStatuses, setStageStatuses] = useState({});
  const [findings, setFindings] = useState([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const STAGE_IDS = [
    'Static Analysis',
    'Security Scan',
    'Performance & Big-O',
    'AI Review',
    'Aggregation & Ranking',
  ];

  const run = async (skipAi) => {
    if (!code?.trim() || running) return;
    setRunning(true);
    setError('');
    setFindings([]);
    setStageStatuses(
      Object.fromEntries(STAGE_IDS.map((s) => [s, s === 'AI Review' && skipAi ? 'skipped' : 'running'])),
    );
    try {
      const data = await apiClient.runReviewPipeline(code, language, skipAi);
      setStageStatuses(Object.fromEntries(STAGE_IDS.map((s) => [s, s === 'AI Review' && skipAi ? 'skipped' : 'complete'])));
      setFindings(data.ranked_findings || []);
    } catch (err) {
      setError(err.message || 'Review failed');
      setStageStatuses({});
    } finally {
      setRunning(false);
    }
  };

  if (!code?.trim()) {
    return (
      <div className="rounded-xl border p-6 text-sm text-muted text-center" style={{ borderColor: 'var(--card-border)' }}>
        Write or open code, then run a review to see ranked findings here.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PipelineView
        isRunning={running}
        stageStatuses={stageStatuses}
        onStartQuick={() => run(true)}
        onStartDeep={() => run(false)}
      />
      {error && (
        <div role="alert" className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}
      <FindingsPanel findings={findings} />
    </div>
  );
}
