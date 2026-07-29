import React from 'react';
import AlgorithmVisualizer from './AlgorithmVisualizer';

export default function ComparisonVisualizer({ originalData, optimizedData }) {
  if (!originalData || !optimizedData) {
    return (
      <div className="flex items-center justify-center h-full opacity-50">
        Run a comparison trace to visualize original vs optimized algorithms side-by-side.
      </div>
    );
  }

  // Calculate operation counts
  const countOps = (steps) => {
    let swaps = 0;
    let compares = 0;
    let visits = 0;
    steps.forEach(s => {
      if (s.operation === 'swap') swaps++;
      if (s.operation === 'compare') compares++;
      if (s.operation === 'visit') visits++;
    });
    return { swaps, compares, visits, total: steps.length };
  };

  const origOps = countOps(originalData.steps || []);
  const optOps = countOps(optimizedData.steps || []);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Stats Header */}
      <div className="grid grid-cols-2 gap-4 shrink-0">
        <div className="rounded-lg border p-3 bg-slate-900/50 flex flex-col gap-2" style={{ borderColor: 'var(--border-color, #334155)' }}>
          <h3 className="font-semibold text-sm opacity-80 uppercase tracking-wide">Original Performance</h3>
          <div className="flex gap-4 text-xs font-mono">
            <div>Steps: <span className="text-teal-300">{origOps.total}</span></div>
            <div>Compares: <span className="text-teal-300">{origOps.compares}</span></div>
            <div>Swaps: <span className="text-teal-300">{origOps.swaps}</span></div>
          </div>
        </div>
        <div className="rounded-lg border p-3 bg-slate-900/50 flex flex-col gap-2" style={{ borderColor: 'var(--border-color, #334155)' }}>
          <h3 className="font-semibold text-sm opacity-80 uppercase tracking-wide">Optimized Performance</h3>
          <div className="flex gap-4 text-xs font-mono">
            <div>Steps: <span className="text-teal-300">{optOps.total}</span></div>
            <div>Compares: <span className="text-teal-300">{optOps.compares}</span></div>
            <div>Swaps: <span className="text-teal-300">{optOps.swaps}</span></div>
          </div>
          {optOps.total < origOps.total && (
            <div className="absolute top-2 right-2 text-[10px] bg-green-500/20 text-green-400 px-2 rounded-full border border-green-500/30">
              {Math.round(((origOps.total - optOps.total) / origOps.total) * 100)}% Fewer Steps
            </div>
          )}
        </div>
      </div>

      {/* Visualizers Side-by-Side */}
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        <div className="min-h-0 relative">
          <AlgorithmVisualizer
            code={originalData.code}
            steps={originalData.steps}
            pattern={originalData.pattern}
            title="Original Code"
          />
        </div>
        <div className="min-h-0 relative">
          <AlgorithmVisualizer
            code={optimizedData.code}
            steps={optimizedData.steps}
            pattern={optimizedData.pattern}
            title="Optimized Code"
          />
        </div>
      </div>
    </div>
  );
}

