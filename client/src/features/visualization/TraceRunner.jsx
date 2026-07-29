import React, { useState } from 'react';
import AlgorithmVisualizer from './AlgorithmVisualizer';

export default function TraceRunner({ code, language }) {
  const [traceData, setTraceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleTrace = async () => {
    if (language !== 'python' && language !== 'Python') {
      setError('Tracing is currently only supported for Python code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/sandbox/trace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, timeout_ms: 8000 })
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.detail || data.error || 'Trace failed');
      }

      setTraceData({
        code,
        steps: data.steps,
        pattern: data.pattern,
        truncated: data.truncated
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between p-4 rounded-lg border bg-slate-900/50" style={{ borderColor: 'var(--border-color, #334155)' }}>
        <div>
          <h3 className="font-semibold" style={{ color: 'var(--fg-color)' }}>Algorithm Tracer</h3>
          <p className="text-xs opacity-70">Execute Python code step-by-step and visualize variable state changes.</p>
        </div>
        <button
          onClick={handleTrace}
          disabled={loading || !code}
          className="px-4 py-2 rounded font-medium text-sm text-white transition disabled:opacity-50"
          style={{ background: 'var(--primary-color, #0ea5e9)' }}
        >
          {loading ? 'Tracing...' : 'Run Trace'}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {traceData?.truncated && (
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm flex gap-2 items-center">
          <span>âš ï¸</span>
          <span>Trace hit the 10,000 step limit and was truncated (possible infinite loop).</span>
        </div>
      )}

      {traceData ? (
        <div className="flex-1 min-h-[500px]">
          <AlgorithmVisualizer
            code={traceData.code}
            steps={traceData.steps}
            pattern={traceData.pattern}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-[300px] flex items-center justify-center border border-dashed rounded-lg opacity-50" style={{ borderColor: 'var(--border-color, #334155)' }}>
          Click "Run Trace" to execute the code and visualize the algorithm.
        </div>
      )}
    </div>
  );
}

