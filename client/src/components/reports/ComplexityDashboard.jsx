import React, { useState } from 'react';
import {
  Activity, AlertTriangle, BookOpen, GitBranch,
  Trash2, TrendingDown, TrendingUp, Zap, ChevronDown, ChevronRight,
  Code, FileWarning, ArrowRight
} from 'lucide-react';

const GRADE_COLORS = {
  A: { bg: 'rgba(16,185,129,0.15)', text: '#10b981', border: 'rgba(16,185,129,0.4)' },
  B: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6', border: 'rgba(59,130,246,0.4)' },
  C: { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', border: 'rgba(245,158,11,0.4)' },
  D: { bg: 'rgba(249,115,22,0.15)', text: '#f97316', border: 'rgba(249,115,22,0.4)' },
  F: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', border: 'rgba(239,68,68,0.4)' },
};

function GradeBadge({ grade, size = 'md' }) {
  const colors = GRADE_COLORS[grade] || GRADE_COLORS.C;
  const sizes = {
    sm: { width: 28, height: 28, fontSize: 13 },
    md: { width: 40, height: 40, fontSize: 18 },
    lg: { width: 64, height: 64, fontSize: 28 },
  };
  const s = sizes[size] || sizes.md;
  return (
    <div style={{
      width: s.width, height: s.height,
      borderRadius: '50%',
      background: colors.bg,
      border: `2px solid ${colors.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: s.fontSize, color: colors.text,
      flexShrink: 0,
    }}>
      {grade}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sublabel, color = '#94a3b8' }) {
  return (
    <div style={{
      background: 'rgba(30,41,59,0.5)',
      border: '1px solid rgba(148,163,184,0.15)',
      borderRadius: 10, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      flex: '1 1 150px', minWidth: 150,
    }}>
      <Icon size={20} color={color} style={{ flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#e2e8f0' }}>{value}</div>
        {sublabel && <div style={{ fontSize: 11, color: '#64748b' }}>{sublabel}</div>}
      </div>
    </div>
  );
}

function FunctionRow({ fn, isExpanded, onToggle }) {
  const colors = GRADE_COLORS[fn.grade] || GRADE_COLORS.C;
  return (
    <>
      <tr
        onClick={onToggle}
        style={{ cursor: 'pointer', borderBottom: '1px solid rgba(148,163,184,0.08)' }}
      >
        <td style={{ padding: '8px 10px' }}>
          {isExpanded ? <ChevronDown size={14} color="#64748b" /> : <ChevronRight size={14} color="#64748b" />}
        </td>
        <td style={{ padding: '8px 6px' }}>
          <GradeBadge grade={fn.grade} size="sm" />
        </td>
        <td style={{ padding: '8px 6px', fontFamily: 'monospace', fontSize: 13, color: '#e2e8f0' }}>
          {fn.name}
          {fn.is_async && <span style={{ color: '#818cf8', fontSize: 10, marginLeft: 6 }}>async</span>}
          {fn.is_recursive && <span style={{ color: '#f59e0b', fontSize: 10, marginLeft: 6 }}>recursive</span>}
        </td>
        <td style={{ padding: '8px 6px', textAlign: 'center', fontSize: 13, color: '#e2e8f0' }}>{fn.loc}</td>
        <td style={{ padding: '8px 6px', textAlign: 'center', fontSize: 13, color: fn.cyclomatic_complexity > 10 ? '#ef4444' : fn.cyclomatic_complexity > 6 ? '#f59e0b' : '#10b981' }}>
          {fn.cyclomatic_complexity}
        </td>
        <td style={{ padding: '8px 6px', textAlign: 'center', fontSize: 13, color: fn.cognitive_complexity > 15 ? '#ef4444' : fn.cognitive_complexity > 7 ? '#f59e0b' : '#10b981' }}>
          {fn.cognitive_complexity}
        </td>
        <td style={{ padding: '8px 6px', textAlign: 'center', fontFamily: 'monospace', fontSize: 12, color: '#818cf8' }}>
          {fn.time_complexity}
        </td>
        <td style={{ padding: '8px 6px', textAlign: 'center', fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>
          {fn.space_complexity}
        </td>
        <td style={{ padding: '8px 6px', textAlign: 'center', fontSize: 13, color: fn.maintainability_index < 40 ? '#ef4444' : fn.maintainability_index < 65 ? '#f59e0b' : '#10b981' }}>
          {fn.maintainability_index?.toFixed(1)}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={9} style={{ padding: '0 10px 12px 38px', background: 'rgba(15,23,42,0.4)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, padding: '10px 0', fontSize: 12 }}>
              <div><span style={{ color: '#64748b' }}>Line:</span> <span style={{ color: '#e2e8f0' }}>{fn.line}â€“{fn.end_line}</span></div>
              <div><span style={{ color: '#64748b' }}>Args:</span> <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{fn.args?.join(', ') || 'none'}</span></div>
              <div><span style={{ color: '#64748b' }}>Docstring:</span> <span style={{ color: fn.has_docstring ? '#10b981' : '#f59e0b' }}>{fn.has_docstring ? 'Yes' : 'Missing'}</span></div>
              {fn.halstead?.volume > 0 && (
                <>
                  <div><span style={{ color: '#64748b' }}>Halstead Vol:</span> <span style={{ color: '#e2e8f0' }}>{fn.halstead.volume}</span></div>
                  <div><span style={{ color: '#64748b' }}>Difficulty:</span> <span style={{ color: '#e2e8f0' }}>{fn.halstead.difficulty}</span></div>
                  <div><span style={{ color: '#64748b' }}>Est. Bugs:</span> <span style={{ color: fn.halstead.bugs_estimate > 0.5 ? '#f59e0b' : '#10b981' }}>{fn.halstead.bugs_estimate}</span></div>
                </>
              )}
              {fn.calls?.length > 0 && (
                <div><span style={{ color: '#64748b' }}>Calls:</span> <span style={{ color: '#818cf8', fontFamily: 'monospace' }}>{fn.calls.join(', ')}</span></div>
              )}
              {fn.called_by?.length > 0 && (
                <div><span style={{ color: '#64748b' }}>Called by:</span> <span style={{ color: '#818cf8', fontFamily: 'monospace' }}>{fn.called_by.join(', ')}</span></div>
              )}
            </div>
            {fn.complexity_explanation && (
              <div style={{ fontSize: 12, color: '#94a3b8', paddingBottom: 4 }}>{fn.complexity_explanation}</div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function CallGraph({ graph }) {
  const entries = Object.entries(graph || {});
  if (!entries.length) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {entries.map(([caller, callees]) => (
        callees.length > 0 && (
          <div key={caller} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(30,41,59,0.5)',
            border: '1px solid rgba(148,163,184,0.12)',
            borderRadius: 6, padding: '5px 10px', fontSize: 12,
          }}>
            <span style={{ color: '#818cf8', fontFamily: 'monospace' }}>{caller}</span>
            <ArrowRight size={12} color="#64748b" />
            {callees.map((c, i) => (
              <span key={c} style={{ color: '#10b981', fontFamily: 'monospace' }}>
                {c}{i < callees.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
        )
      ))}
      {entries.every(([, c]) => c.length === 0) && (
        <span style={{ color: '#64748b', fontSize: 12 }}>No inter-function calls detected</span>
      )}
    </div>
  );
}

export default function ComplexityDashboard({ data, comparison }) {
  const [expandedFn, setExpandedFn] = useState(null);
  const [activeTab, setActiveTab] = useState('functions');

  if (!data || data.error) {
    if (data?.error) {
      return (
        <div style={{ padding: 20, color: '#ef4444', background: 'rgba(239,68,68,0.08)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)' }}>
          <AlertTriangle size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          {data.error}
        </div>
      );
    }
    return null;
  }

  const agg = data.aggregate || {};
  const functions = data.functions || [];
  const deadCode = data.dead_code || [];
  const recs = data.recommendations || [];

  const tabs = [
    { id: 'functions', label: 'Functions', count: functions.length },
    { id: 'deadcode', label: 'Dead Code', count: deadCode.length },
    { id: 'callgraph', label: 'Call Graph' },
    { id: 'recommendations', label: 'Recommendations', count: recs.length },
  ];

  return (
    <div style={{
      background: 'rgba(15,23,42,0.6)',
      border: '1px solid rgba(148,163,184,0.12)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header with overall grade */}
      <div style={{
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(148,163,184,0.1)',
        background: 'rgba(30,41,59,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <GradeBadge grade={data.grade} size="lg" />
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#e2e8f0' }}>
              Complexity Analysis
              <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8, fontWeight: 400 }}>
                {data.engine || 'local'}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>
              Score: <strong style={{ color: '#e2e8f0' }}>{data.score}/100</strong>
              {' Â· '}
              {agg.total_functions} functions
              {' Â· '}
              {agg.non_empty_loc || data.non_empty_lines} lines
            </div>
          </div>
        </div>
        {comparison && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: comparison.score_delta > 0 ? 'rgba(16,185,129,0.1)' : comparison.score_delta < 0 ? 'rgba(239,68,68,0.1)' : 'rgba(148,163,184,0.08)',
            border: `1px solid ${comparison.score_delta > 0 ? 'rgba(16,185,129,0.3)' : comparison.score_delta < 0 ? 'rgba(239,68,68,0.3)' : 'rgba(148,163,184,0.15)'}`,
            borderRadius: 8, padding: '6px 12px',
          }}>
            {comparison.score_delta > 0 ? <TrendingUp size={16} color="#10b981" /> : <TrendingDown size={16} color="#ef4444" />}
            <span style={{ fontSize: 12, color: '#e2e8f0' }}>
              {comparison.grade_before} â†’ {comparison.grade_after}
              {' Â· '}
              {comparison.score_delta > 0 ? '+' : ''}{comparison.score_delta} pts
            </span>
          </div>
        )}
      </div>

      {/* Metric cards row */}
      <div style={{ padding: '12px 20px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <MetricCard icon={Activity} label="Max Cyclomatic" value={agg.max_cyclomatic} sublabel={`avg: ${agg.avg_cyclomatic}`} color="#3b82f6" />
        <MetricCard icon={Zap} label="Max Cognitive" value={agg.max_cognitive} sublabel={`avg: ${agg.avg_cognitive}`} color="#f59e0b" />
        <MetricCard icon={BookOpen} label="Maintainability" value={agg.avg_maintainability?.toFixed(1)} sublabel="avg index" color="#10b981" />
        <MetricCard icon={Trash2} label="Dead Code" value={agg.dead_code_count} sublabel="unused items" color={agg.dead_code_count > 0 ? '#ef4444' : '#10b981'} />
        <MetricCard icon={Code} label="Comments" value={`${(agg.comment_ratio * 100)?.toFixed(0)}%`} sublabel={`${agg.comment_lines} lines`} color="#818cf8" />
      </div>

      {/* Grade distribution */}
      {agg.grade_distribution && (
        <div style={{ padding: '0 20px 12px', display: 'flex', gap: 6 }}>
          {Object.entries(agg.grade_distribution).map(([g, count]) => (
            <div key={g} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 6, fontSize: 12,
              background: GRADE_COLORS[g]?.bg || 'rgba(148,163,184,0.08)',
              border: `1px solid ${GRADE_COLORS[g]?.border || 'rgba(148,163,184,0.15)'}`,
              color: GRADE_COLORS[g]?.text || '#94a3b8',
              opacity: count > 0 ? 1 : 0.35,
            }}>
              <strong>{g}</strong>
              <span style={{ fontSize: 11 }}>Ã—{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 0,
        borderTop: '1px solid rgba(148,163,184,0.1)',
        borderBottom: '1px solid rgba(148,163,184,0.1)',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px', fontSize: 12, fontWeight: 500,
              background: activeTab === tab.id ? 'rgba(99,102,241,0.1)' : 'transparent',
              color: activeTab === tab.id ? '#818cf8' : '#94a3b8',
              border: 'none', cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid #818cf8' : '2px solid transparent',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {tab.label}
            {tab.count != null && (
              <span style={{
                background: 'rgba(148,163,184,0.12)', borderRadius: 10,
                padding: '1px 6px', fontSize: 10,
              }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: '12px 0' }}>
        {activeTab === 'functions' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.12)' }}>
                  <th style={{ width: 24 }}></th>
                  <th style={{ padding: '6px', textAlign: 'left', color: '#64748b', fontSize: 11, fontWeight: 500 }}>Grade</th>
                  <th style={{ padding: '6px', textAlign: 'left', color: '#64748b', fontSize: 11, fontWeight: 500 }}>Function</th>
                  <th style={{ padding: '6px', textAlign: 'center', color: '#64748b', fontSize: 11, fontWeight: 500 }}>LOC</th>
                  <th style={{ padding: '6px', textAlign: 'center', color: '#64748b', fontSize: 11, fontWeight: 500 }}>CC</th>
                  <th style={{ padding: '6px', textAlign: 'center', color: '#64748b', fontSize: 11, fontWeight: 500 }}>Cog</th>
                  <th style={{ padding: '6px', textAlign: 'center', color: '#64748b', fontSize: 11, fontWeight: 500 }}>Time</th>
                  <th style={{ padding: '6px', textAlign: 'center', color: '#64748b', fontSize: 11, fontWeight: 500 }}>Space</th>
                  <th style={{ padding: '6px', textAlign: 'center', color: '#64748b', fontSize: 11, fontWeight: 500 }}>MI</th>
                </tr>
              </thead>
              <tbody>
                {functions.map((fn, i) => (
                  <FunctionRow
                    key={fn.name + i}
                    fn={fn}
                    isExpanded={expandedFn === i}
                    onToggle={() => setExpandedFn(expandedFn === i ? null : i)}
                  />
                ))}
              </tbody>
            </table>
            {functions.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                No functions found in code
              </div>
            )}
          </div>
        )}

        {activeTab === 'deadcode' && (
          <div style={{ padding: '0 20px' }}>
            {deadCode.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#10b981', fontSize: 13 }}>
                No dead code detected â€” clean!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {deadCode.map((d, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 8,
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.12)',
                  }}>
                    <FileWarning size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 12 }}>
                      <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>{d.name}</span>
                      <span style={{ color: '#64748b', marginLeft: 8 }}>
                        ({d.kind}, line {d.line})
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{d.reason}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'callgraph' && (
          <div style={{ padding: '4px 20px' }}>
            <CallGraph graph={data.call_graph} />
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div style={{ padding: '0 20px' }}>
            {recs.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '8px 0',
                borderBottom: i < recs.length - 1 ? '1px solid rgba(148,163,184,0.06)' : 'none',
              }}>
                <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                <span style={{ fontSize: 13, color: '#e2e8f0' }}>{r}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

