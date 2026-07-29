import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Clock, ShieldAlert, Code, FileWarning } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const DEBT_COLORS = {
  complexity: '#6366f1',
  security: '#ef4444',
  rules: '#f59e0b',
  testing: '#10b981',
};

const DEBT_LABELS = {
  complexity: 'Complexity',
  security: 'Security',
  rules: 'Rule Violations',
  testing: 'Missing Tests',
};

const DEBT_ICONS = {
  complexity: <Code size={16} />,
  security: <ShieldAlert size={16} />,
  rules: <FileWarning size={16} />,
  testing: <Clock size={16} />,
};

export default function QualityTrendPanel() {
  const [trendData, setTrendData] = useState(null);
  const [debtData, setDebtData] = useState(null);
  const [range, setRange] = useState('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [range]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      const [trendRes, debtRes] = await Promise.all([
        fetch(`${API_URL}/analytics/trends?range=${range}`, { headers, credentials: 'include' }),
        fetch(`${API_URL}/analytics/debt`, { headers, credentials: 'include' }),
      ]);

      if (trendRes.ok) setTrendData(await trendRes.json());
      if (debtRes.ok) setDebtData(await debtRes.json());
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const directionIcon = {
    improving: <TrendingUp size={20} className="text-emerald-400" />,
    degrading: <TrendingDown size={20} className="text-red-400" />,
    stable: <Minus size={20} className="text-slate-400" />,
  };

  const directionColor = {
    improving: '#10b981',
    degrading: '#ef4444',
    stable: '#94a3b8',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 opacity-50">
        <div className="animate-spin w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full mr-3" />
        Loading analytics...
      </div>
    );
  }

  const series = trendData?.series || [];
  const direction = trendData?.direction || 'stable';
  const slope = trendData?.slope || 0;

  // Format series for chart
  const chartData = series.map(s => ({
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: s.score,
  }));

  // Debt pie data
  const debtPie = debtData ? Object.entries(debtData.by_category || {})
    .filter(([_, v]) => v > 0)
    .map(([k, v]) => ({ name: DEBT_LABELS[k] || k, value: v, color: DEBT_COLORS[k] || '#64748b' }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header with range selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--fg-color)' }}>Quality Trend</h2>
          <div className="flex items-center gap-2 mt-1">
            {directionIcon[direction]}
            <span className="text-sm font-medium" style={{ color: directionColor[direction] }}>
              {direction.charAt(0).toUpperCase() + direction.slice(1)}
              {slope !== 0 && ` (${slope > 0 ? '+' : ''}${slope}/step)`}
            </span>
          </div>
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--card-border)' }}>
          {['7d', '30d', '90d'].map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${range === r ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' : 'text-muted hover:text-white'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Trend Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-4 border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
      >
        {chartData.length > 0 ? (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Line type="monotone" dataKey="score" stroke="#14b8a6" strokeWidth={2} dot={{ fill: '#14b8a6', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-sm opacity-50">
            No quality data yet. Run an inspection to start tracking.
          </div>
        )}
      </motion.div>

      {/* Tech Debt Breakdown */}
      {debtData && debtData.total_hours > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl p-4 border" style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm" style={{ color: 'var(--fg-color)' }}>Tech Debt Estimate</h3>
            <span className="text-xl font-bold" style={{ color: '#f59e0b' }}>
              {debtData.total_hours}h
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {Object.entries(debtData.by_category || {}).map(([category, hours]) => (
              <div key={category} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <div className="p-2 rounded-lg" style={{ background: `${DEBT_COLORS[category]}20`, color: DEBT_COLORS[category] }}>
                  {DEBT_ICONS[category] || <Clock size={16} />}
                </div>
                <div>
                  <div className="text-xs opacity-60">{DEBT_LABELS[category] || category}</div>
                  <div className="font-semibold text-sm">{hours}h</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

