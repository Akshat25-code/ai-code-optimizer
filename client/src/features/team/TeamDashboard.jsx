import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Settings, Share2, Activity, Shield, Key } from 'lucide-react';

export default function TeamDashboard({ user, teamData = null }) {
  const [activeTab, setActiveTab] = useState('members');

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users size={48} className="text-slate-500 mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-slate-300">Team Workspaces</h2>
        <p className="text-slate-500 mt-2 max-w-md">Sign in to create a team workspace, invite collaborators, and share code securely.</p>
      </div>
    );
  }

  // Mock data if none provided yet
  const team = teamData || {
    name: "Engineering Core",
    members: [
      { id: '1', name: 'Alice (You)', role: 'owner', email: 'alice@example.com', active: true },
      { id: '2', name: 'Bob', role: 'editor', email: 'bob@example.com', active: true },
      { id: '3', name: 'Charlie', role: 'viewer', email: 'charlie@example.com', active: false },
    ],
    analytics: { avg_score: 92, total_debt: 14 }
  };

  return (
    <div className="p-6 rounded-2xl border bg-black/20" style={{ borderColor: 'var(--card-border)' }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--fg-color)' }}>
            <Users size={24} className="text-teal-400" />
            {team.name}
          </h2>
          <p className="text-sm text-slate-400 mt-1">Manage your team workspace and access controls.</p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 border border-teal-500/30 transition-all text-sm font-medium">
          <UserPlus size={16} /> Invite Member
        </button>
      </div>

      <div className="flex gap-4 mb-6 border-b border-slate-700/50 pb-2">
        {['members', 'analytics', 'settings'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              activeTab === tab
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'members' && (
          <motion.div
            key="members"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {team.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 rounded-xl border bg-slate-900/50" style={{ borderColor: 'var(--card-border)' }}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg font-bold text-slate-300 border border-slate-700 relative">
                    {member.name.charAt(0)}
                    {member.active && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-200">{member.name}</div>
                    <div className="text-xs text-slate-500">{member.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider border ${
                    member.role === 'owner' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    member.role === 'editor' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
                    'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {member.role}
                  </span>

                  <button className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
                    <Settings size={16} />
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="p-6 rounded-xl border bg-slate-900/50 flex flex-col gap-2" style={{ borderColor: 'var(--card-border)' }}>
              <div className="text-slate-400 text-sm font-medium flex items-center gap-2">
                <Activity size={16} /> Team Quality Average
              </div>
              <div className="text-3xl font-bold text-teal-400">{team.analytics.avg_score}</div>
              <div className="text-xs text-slate-500 mt-2">Across all member snapshots</div>
            </div>

            <div className="p-6 rounded-xl border bg-slate-900/50 flex flex-col gap-2" style={{ borderColor: 'var(--card-border)' }}>
              <div className="text-slate-400 text-sm font-medium flex items-center gap-2">
                <Shield size={16} /> Total Tech Debt
              </div>
              <div className="text-3xl font-bold text-amber-400">{team.analytics.total_debt}h</div>
              <div className="text-xs text-slate-500 mt-2">Combined across team projects</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

