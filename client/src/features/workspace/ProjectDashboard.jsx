import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Activity, Code, FileText, AlertTriangle } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ProjectDashboard({ analysis, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 opacity-60">
          <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
          <p className="text-sm">Analyzing project...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex-1 flex items-center justify-center h-full opacity-50 text-sm">
        No project analysis available.
      </div>
    );
  }

  // Format language data for pie chart
  const langData = Object.entries(analysis.language_breakdown || {}).map(([name, value]) => ({
    name,
    value
  })).sort((a, b) => b.value - a.value);

  const avgScore = analysis.avg_score || 0;
  const scoreColor = avgScore >= 85 ? 'text-emerald-500' : avgScore >= 60 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Project Overview</h2>
      </div>

      {/* High-level metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border bg-black/20 flex flex-col" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2 opacity-70 mb-2">
            <Activity size={16} />
            <span className="text-xs uppercase tracking-wider font-semibold">Avg Quality</span>
          </div>
          <div className={`text-3xl font-bold ${scoreColor}`}>
            {avgScore.toFixed(1)}<span className="text-lg opacity-50">/100</span>
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-black/20 flex flex-col" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2 opacity-70 mb-2">
            <FileText size={16} />
            <span className="text-xs uppercase tracking-wider font-semibold">Total Files</span>
          </div>
          <div className="text-3xl font-bold">{analysis.total_files}</div>
        </div>

        <div className="p-4 rounded-lg border bg-black/20 flex flex-col" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2 opacity-70 mb-2">
            <Code size={16} />
            <span className="text-xs uppercase tracking-wider font-semibold">Total Lines</span>
          </div>
          <div className="text-3xl font-bold">{analysis.total_lines?.toLocaleString() || 0}</div>
        </div>

        <div className="p-4 rounded-lg border bg-black/20 flex flex-col" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2 opacity-70 mb-2">
            <AlertTriangle size={16} />
            <span className="text-xs uppercase tracking-wider font-semibold">Hotspots</span>
          </div>
          <div className="text-3xl font-bold text-amber-500">{analysis.hotspots?.length || 0}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Language Breakdown */}
        <div className="rounded-lg border p-4 bg-black/10 flex flex-col min-h-[300px]" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="text-sm font-semibold mb-4 opacity-80 uppercase tracking-wider">Language Breakdown</h3>
          <div className="flex-1 min-h-[200px]">
            {langData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={langData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {langData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center opacity-50">No language data</div>
            )}
          </div>
        </div>

        {/* Hotspots */}
        <div className="rounded-lg border p-4 bg-black/10 flex flex-col min-h-[300px]" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="text-sm font-semibold mb-4 opacity-80 uppercase tracking-wider">Quality Hotspots (Lowest Scores)</h3>
          <div className="flex-1 overflow-auto space-y-2 pr-2">
            {(!analysis.hotspots || analysis.hotspots.length === 0) ? (
              <div className="flex h-full items-center justify-center opacity-50 text-sm">No code files analyzed yet</div>
            ) : (
              analysis.hotspots.map((hotspot, i) => (
                <div key={i} className="flex flex-col gap-1 p-3 rounded border bg-black/20" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate flex-1" title={hotspot.path}>{hotspot.path}</span>
                    <span className={`text-sm font-bold ${hotspot.score >= 85 ? 'text-emerald-500' : hotspot.score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                      {hotspot.score}/100
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs opacity-60">
                    <span>{hotspot.lines} lines</span>
                    <span>{hotspot.findings_count || 0} issues</span>
                    <span>Complexity: {hotspot.max_complexity || 0}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Dependency Graph Note */}
      <div className="rounded-lg border p-4 bg-black/10" style={{ borderColor: 'var(--border-color)' }}>
        <h3 className="text-sm font-semibold mb-2 opacity-80 uppercase tracking-wider">Dependency Graph</h3>
        <p className="text-sm opacity-70">
          The project dependency graph allows you to visualize cross-file imports and see the impact of changing a file. Select a file in the sidebar to see its specific dependencies.
        </p>
      </div>
    </div>
  );
}

