import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Loader2, Play, ShieldAlert, Code2, Zap, BrainCircuit, Layers } from 'lucide-react';

const STAGES = [
  { id: 'Static Analysis', icon: <Code2 size={18} />, label: 'Static Analysis' },
  { id: 'Security Scan', icon: <ShieldAlert size={18} />, label: 'Security Scan' },
  { id: 'Performance & Big-O', icon: <Zap size={18} />, label: 'Performance' },
  { id: 'AI Review', icon: <BrainCircuit size={18} />, label: 'AI Review' },
  { id: 'Aggregation & Ranking', icon: <Layers size={18} />, label: 'Aggregation' },
];

export default function PipelineView({ isRunning, stageStatuses, onStartQuick, onStartDeep }) {
  return (
    <div className="rounded-xl border p-6 mb-6" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--fg-color)' }}>AI Review Pipeline</h2>
          <p className="text-sm text-muted mt-1">Multi-stage deep inspection and security scanning.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onStartQuick}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--fg-color)',
              opacity: isRunning ? 0.5 : 1
            }}
          >
            <Play size={16} /> Quick Review (No AI)
          </button>
          <button
            onClick={onStartDeep}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-white shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
              opacity: isRunning ? 0.5 : 1
            }}
          >
            <BrainCircuit size={16} /> Deep Review (All Stages)
          </button>
        </div>
      </div>

      {/* Nodes */}
      <div className="flex items-center justify-between relative px-2">
        {/* Connecting line */}
        <div className="absolute left-[5%] right-[5%] top-1/2 h-0.5 bg-slate-700/50 -z-10 transform -translate-y-1/2"></div>

        {STAGES.map((stage, idx) => {
          const status = stageStatuses[stage.id] || 'pending'; // pending, running, complete, skipped

          let iconColor = 'text-slate-500';
          let bgColor = 'bg-slate-800 border-slate-700';
          let StatusIcon = Circle;

          if (status === 'complete') {
            iconColor = 'text-emerald-400';
            bgColor = 'bg-emerald-950/40 border-emerald-500/30';
            StatusIcon = CheckCircle2;
          } else if (status === 'running') {
            iconColor = 'text-teal-400';
            bgColor = 'bg-teal-950/40 border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.3)]';
            StatusIcon = Loader2;
          } else if (status === 'skipped') {
            iconColor = 'text-slate-500 opacity-50';
            bgColor = 'bg-slate-800 border-slate-700 opacity-50';
            StatusIcon = Circle;
          }

          return (
            <div key={stage.id} className="flex flex-col items-center relative gap-3">
              <motion.div
                layout
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${bgColor}`}
              >
                {status === 'running' ? (
                  <Loader2 size={24} className={`animate-spin ${iconColor}`} />
                ) : (
                  <div className={iconColor}>{stage.icon}</div>
                )}
              </motion.div>

              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold" style={{ color: 'var(--fg-color)' }}>{stage.label}</span>
                <span className={`text-[10px] uppercase font-bold mt-1 ${
                  status === 'complete' ? 'text-emerald-400' :
                  status === 'running' ? 'text-teal-400 animate-pulse' :
                  'text-slate-500'
                }`}>
                  {status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

