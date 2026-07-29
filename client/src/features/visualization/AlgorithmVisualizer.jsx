import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import CodeEditor from '@/components/editor/CodeEditor';

export default function AlgorithmVisualizer({
  code,
  steps = [],
  pattern = "unknown",
  title = "Algorithm Visualization"
}) {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(500);
  const timerRef = useRef(null);

  // If steps array changes, reset
  useEffect(() => {
    setCurrentStepIdx(0);
    setIsPlaying(false);
  }, [steps]);

  // Handle playback
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStepIdx(prev => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speedMs);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, speedMs, steps.length]);

  const currentStep = steps[currentStepIdx] || null;
  const currentVars = currentStep?.variables || {};

  // Try to find the primary array to visualize (for sorting/searching)
  let primaryArrayName = null;
  let primaryArray = null;

  if (pattern === "sorting" || pattern === "binary_search") {
    // Look for variables that are arrays
    const arrayVars = Object.entries(currentVars)
      .filter(([_, v]) => Array.isArray(v))
      .sort((a, b) => b[1].length - a[1].length); // Get longest array

    if (arrayVars.length > 0) {
      primaryArrayName = arrayVars[0][0];
      primaryArray = arrayVars[0][1];
    }
  }

  // Calculate max value for scaling bars
  const maxVal = primaryArray ? Math.max(...primaryArray.filter(v => typeof v === 'number'), 10) : 100;

  const handlePlayPause = () => {
    if (currentStepIdx >= steps.length - 1 && !isPlaying) {
      setCurrentStepIdx(0); // Restart if at end
    }
    setIsPlaying(!isPlaying);
  };

  const getBarColor = (idx) => {
    if (!currentStep) return 'bg-teal-500';

    // Highlight based on current variables
    const vars = currentStep.variables;

    if (pattern === "sorting") {
      if (vars.j === idx || vars.i === idx) return 'bg-yellow-400';
      if (currentStep.operation === 'swap' && (vars.j === idx || vars.j + 1 === idx)) return 'bg-red-500';
    } else if (pattern === "binary_search") {
      if (idx === vars.mid) return 'bg-red-500';
      if (idx >= vars.left && idx <= vars.right) return 'bg-teal-400';
      return 'bg-slate-600 opacity-50';
    }

    return 'bg-teal-500';
  };

  return (
    <div className="flex flex-col h-full rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-color, #334155)', background: 'var(--panel-bg, #1e293b)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-black/20" style={{ borderColor: 'var(--border-color, #334155)' }}>
        <h3 className="font-semibold text-sm">{title}</h3>
        <div className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
          Pattern: <span className="font-mono text-teal-300">{pattern}</span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left side: Code & Variables */}
        <div className="w-1/2 flex flex-col border-r" style={{ borderColor: 'var(--border-color, #334155)' }}>
          {/* Code */}
          <div className="flex-1 min-h-[200px] relative">
             <CodeEditor
                value={code}
                language="python"
                readOnly={true}
                highlightLine={currentStep?.line}
             />
          </div>

          {/* Variables Inspector */}
          <div className="h-1/3 min-h-[150px] border-t overflow-auto bg-black/40 p-2" style={{ borderColor: 'var(--border-color, #334155)' }}>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Variables at Step {currentStepIdx + 1} / {steps.length}</div>
            {currentStep ? (
              <table className="w-full text-xs text-left">
                <tbody>
                  {Object.entries(currentVars).map(([k, v]) => {
                    // Don't show the primary array if we are visualizing it as bars
                    if (k === primaryArrayName) return null;
                    return (
                      <tr key={k} className="border-b border-slate-700/50">
                        <td className="py-1 font-mono text-teal-300 w-1/3 align-top">{k}</td>
                        <td className="py-1 font-mono break-all opacity-90">{JSON.stringify(v)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-xs opacity-50">No data. Run a trace first.</div>
            )}
          </div>
        </div>

        {/* Right side: Visualization canvas & Controls */}
        <div className="w-1/2 flex flex-col">
          {/* Canvas */}
          <div className="flex-1 flex flex-col items-center justify-end p-4 gap-1 relative overflow-hidden bg-black/10">

            {/* Status overlay */}
            {currentStep?.operation && (
              <div className="absolute top-4 right-4 px-3 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded border border-yellow-500/30">
                {currentStep.operation.toUpperCase()}: {currentStep.detail}
              </div>
            )}

            {/* Array Bars */}
            {primaryArray ? (
              <div className="flex items-end justify-center w-full h-full gap-1">
                {primaryArray.map((val, idx) => {
                  const hPct = typeof val === 'number' ? Math.max(5, (val / maxVal) * 100) : 10;
                  return (
                    <div key={idx} className="flex flex-col items-center justify-end h-full w-full max-w-[40px] gap-2">
                      <span className="text-[10px] font-mono opacity-50">{val === "<truncated>" ? "..." : val}</span>
                      <div
                        className={`w-full rounded-t transition-all duration-300 ease-in-out ${getBarColor(idx)}`}
                        style={{ height: `${hPct}%` }}
                      ></div>
                      <span className="text-[10px] opacity-40">{idx}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full opacity-50 text-sm">
                {steps.length > 0 ? "No array found to visualize." : "Waiting for trace..."}
              </div>
            )}
          </div>

          {/* Controls Bar */}
          <div className="h-14 border-t flex items-center justify-between px-4 bg-black/30 shrink-0" style={{ borderColor: 'var(--border-color, #334155)' }}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setIsPlaying(false); setCurrentStepIdx(0); }}
                className="p-1.5 rounded hover:bg-white/10 transition"
                title="Restart"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={() => { setIsPlaying(false); setCurrentStepIdx(Math.max(0, currentStepIdx - 1)); }}
                className="p-1.5 rounded hover:bg-white/10 transition"
                title="Step Back"
              >
                <SkipBack size={16} />
              </button>
              <button
                onClick={handlePlayPause}
                className="p-2 rounded-full bg-teal-600 hover:bg-teal-500 text-white transition"
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
              </button>
              <button
                onClick={() => { setIsPlaying(false); setCurrentStepIdx(Math.min(steps.length - 1, currentStepIdx + 1)); }}
                className="p-1.5 rounded hover:bg-white/10 transition"
                title="Step Forward"
              >
                <SkipForward size={16} />
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs opacity-70">
              <span>Speed:</span>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={1050 - speedMs} // reverse so right = faster
                onChange={(e) => setSpeedMs(1050 - parseInt(e.target.value))}
                className="w-24 accent-teal-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

