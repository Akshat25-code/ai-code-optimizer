import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, Activity, Shield } from 'lucide-react';
import { apiClient } from '@/services/apiClient';

export default function TeamDashboard({ user, onTeamChange }) {
  const [activeTab, setActiveTab] = useState('members');
  const [teams, setTeams] = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) loadTeams();
  }, [user]);

  const loadTeams = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await apiClient.listMyTeams();
      setTeams(list);
      if (list.length && !activeTeam) setActiveTeam(list[0]);
    } catch (err) {
      setError(err.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (onTeamChange) onTeamChange(activeTeam ? activeTeam.id : '');
  }, [activeTeam, onTeamChange]);

  useEffect(() => {
    if (!activeTeam) {
      setAnalytics(null);
      return;
    }
    apiClient.getTeamAnalytics(activeTeam.id).then(setAnalytics).catch(() => setAnalytics(null));
  }, [activeTeam]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setBusy(true);
    setError('');
    try {
      await apiClient.createTeam(newTeamName.trim());
      setNewTeamName('');
      await loadTeams(); // newest team sorts first and auto-selects
    } catch (err) {
      setError(err.message || 'Failed to create team');
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!activeTeam || !inviteEmail.trim()) return;
    setBusy(true);
    setError('');
    try {
      await apiClient.inviteToTeam(activeTeam.id, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      await loadTeams();
    } catch (err) {
      setError(err.message || 'Invite failed');
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users size={48} className="text-slate-500 mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-slate-300">Team Workspaces</h2>
        <p className="text-slate-500 mt-2 max-w-md">Sign in to create a team workspace, invite collaborators, and share code securely.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-slate-400">Loading teams…</div>;
  }

  return (
    <div className="p-6 rounded-2xl border bg-black/20" style={{ borderColor: 'var(--card-border)' }}>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--fg-color)' }}>
            <Users size={24} className="text-teal-400" />
            {activeTeam ? activeTeam.name : 'Team Workspaces'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">Manage your team workspace and access controls.</p>
        </div>
        {teams.length > 1 && (
          <select
            value={activeTeam?.id || ''}
            onChange={(e) => setActiveTeam(teams.find((t) => t.id === e.target.value) || null)}
            className="text-sm px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
            aria-label="Select team"
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {!activeTeam ? (
        <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1">
            <label htmlFor="new-team-name" className="block text-sm text-slate-300 mb-2">Create your first team</label>
            <input
              id="new-team-name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Engineering Core"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !newTeamName.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium disabled:opacity-50"
          >
            <UserPlus size={16} /> {busy ? 'Creating…' : 'Create team'}
          </button>
        </form>
      ) : (
        <>
          <div className="flex gap-4 mb-6 border-b border-slate-700/50 pb-2">
            {['members', 'analytics', 'settings'].map((tab) => (
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
                {(activeTeam.members || []).map((member) => (
                  <div key={member.user_id} className="flex items-center justify-between p-4 rounded-xl border bg-slate-900/50" style={{ borderColor: 'var(--card-border)' }}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg font-bold text-slate-300 border border-slate-700">
                        {(member.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200">{member.email}</div>
                        <div className="text-xs text-slate-500">{member.user_id === user.id ? 'You' : 'Member'}</div>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wider border ${
                      member.role === 'owner' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      member.role === 'editor' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
                      'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {member.role}
                    </span>
                  </div>
                ))}
                {activeTeam.is_owner && (
                  <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2 pt-2">
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="teammate@company.com"
                      aria-label="Invite email"
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      aria-label="Invite role"
                      className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-sm"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button
                      type="submit"
                      disabled={busy || !inviteEmail.trim()}
                      className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium disabled:opacity-50"
                    >
                      {busy ? 'Inviting…' : 'Invite'}
                    </button>
                  </form>
                )}
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
                  <div className="text-3xl font-bold text-teal-400">{analytics?.avg_score ?? '—'}</div>
                  <div className="text-xs text-slate-500 mt-2">Across member snapshots</div>
                </div>
                <div className="p-6 rounded-xl border bg-slate-900/50 flex flex-col gap-2" style={{ borderColor: 'var(--card-border)' }}>
                  <div className="text-slate-400 text-sm font-medium flex items-center gap-2">
                    <Shield size={16} /> Total Tech Debt
                  </div>
                  <div className="text-3xl font-bold text-amber-400">{analytics ? `${analytics.total_debt}h` : '—'}</div>
                  <div className="text-xs text-slate-500 mt-2">Combined across team projects</div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3 text-sm"
              >
                <div className="p-4 rounded-xl border bg-slate-900/50 flex justify-between" style={{ borderColor: 'var(--card-border)' }}>
                  <span className="text-slate-400">Team name</span>
                  <span className="font-semibold text-slate-200">{activeTeam.name}</span>
                </div>
                <div className="p-4 rounded-xl border bg-slate-900/50 flex justify-between" style={{ borderColor: 'var(--card-border)' }}>
                  <span className="text-slate-400">Members</span>
                  <span className="font-semibold text-slate-200">{(activeTeam.members || []).length}</span>
                </div>
                <div className="p-4 rounded-xl border bg-slate-900/50 flex justify-between" style={{ borderColor: 'var(--card-border)' }}>
                  <span className="text-slate-400">Your role</span>
                  <span className="font-semibold text-slate-200">
                    {(activeTeam.members || []).find((m) => m.user_id === user.id)?.role || '—'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
