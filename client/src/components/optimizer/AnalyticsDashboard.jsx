import React, { useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { motion } from 'framer-motion';
import { Activity, Cpu, Database, Zap } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const AnalyticsDashboard = ({ analytics, fetchAnalytics }) => {
  useEffect(() => {
    fetchAnalytics();
  }, []);

  const totalTokens = analytics.reduce((acc, curr) => acc + curr.tokens_in + curr.tokens_out, 0);
  const totalSessions = analytics.reduce((acc, curr) => acc + curr.count, 0);
  
  const pieData = analytics.map((item) => ({
    name: item.provider,
    value: item.tokens_in + item.tokens_out
  }));

  return (
    <div className="space-y-6 p-1">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center gap-4"
        >
          <div className="p-3 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Activity size={24} />
          </div>
          <div>
            <div className="text-xs text-muted">Total Sessions</div>
            <div className="text-xl font-bold">{totalSessions}</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center gap-4"
        >
          <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Zap size={24} />
          </div>
          <div>
            <div className="text-xs text-muted">Total Tokens</div>
            <div className="text-xl font-bold">{totalTokens.toLocaleString()}</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center gap-4"
        >
          <div className="p-3 rounded-lg bg-amber-500/20 text-amber-400">
            <Database size={24} />
          </div>
          <div>
            <div className="text-xs text-muted">Inbound (Req)</div>
            <div className="text-xl font-bold">{analytics.reduce((a, b) => a + b.tokens_in, 0).toLocaleString()}</div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl border border-white/10 bg-white/5 flex items-center gap-4"
        >
          <div className="p-3 rounded-lg bg-purple-500/20 text-purple-400">
            <Cpu size={24} />
          </div>
          <div>
            <div className="text-xs text-muted">Outbound (Res)</div>
            <div className="text-xl font-bold">{analytics.reduce((a, b) => a + b.tokens_out, 0).toLocaleString()}</div>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm"
        >
          <h3 className="text-lg font-semibold mb-6">Token Usage by Provider</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="provider" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="tokens_in" name="Inbound" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tokens_out" name="Outbound" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl border border-white/10 bg-black/20 backdrop-blur-sm"
        >
          <h3 className="text-lg font-semibold mb-6">Market Share (% Tokens)</h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted italic">No data to display yet</div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
