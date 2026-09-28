import React, { useState } from 'react';
import TeamDashboard from './TeamDashboard';
import CollaborativeEditor from './CollaborativeEditor';
import { useCollabRoom } from './useCollabRoom';

/**
 * Team area: dashboard (teams, invites, analytics) + optional live room.
 * The live editor shares code snapshots over the session socket
 * (last-writer-wins); presence comes from server broadcasts.
 */
export default function TeamPanel({ user }) {
  const [teamId, setTeamId] = useState('');
  const [code, setCode] = useState('// Paste code to co-edit with your team…\n');
  const [live, setLive] = useState(false);

  const { peers, connected, sendCode } = useCollabRoom(live ? teamId || 'lobby' : '', user, setCode);

  const handleCode = (v) => {
    setCode(v);
    if (live) sendCode(v);
  };

  return (
    <div className="space-y-4">
      <TeamDashboard user={user} onTeamChange={setTeamId} />
      <div className="rounded-2xl border bg-black/20 p-4 space-y-3" style={{ borderColor: 'var(--card-border)' }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-sm" style={{ color: 'var(--fg-color)' }}>Live room</h3>
            <p className="text-xs text-muted">
              {live
                ? (connected ? `Connected · ${peers.length} participant(s)` : 'Connecting…')
                : 'Share an editor with whoever joins this room.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              placeholder="Room id (e.g. team id, default: lobby)"
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 w-56"
            />
            <button
              type="button"
              onClick={() => setLive((v) => !v)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold text-white ${live ? 'bg-red-600' : 'bg-teal-600'}`}
            >
              {live ? 'Leave' : 'Go live'}
            </button>
          </div>
        </div>
        <div className="h-72">
          <CollaborativeEditor
            code={code}
            setCode={handleCode}
            language="python"
            readOnly={!live}
            users={peers.map((p, i) => ({ ...p, color: ['#6366f1', '#3ECF8E', '#f59e0b', '#ec4899'][i % 4] }))}
          />
        </div>
        {!live && (
          <p className="text-[11px] text-muted">Read-only preview until you go live. Remote edits apply as snapshots (last writer wins).</p>
        )}
      </div>
    </div>
  );
}
