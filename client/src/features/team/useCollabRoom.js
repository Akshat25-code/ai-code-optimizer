import { useEffect, useRef, useState } from 'react';
import { WS_BASE } from '@/config';

/**
 * Minimal collaboration room over /ws/session/{roomId}.
 * - Sends presence hello + debounced code snapshots (tagged with our id).
 * - Applies remote snapshots from OTHER senders (echo-suppressed by id).
 * - Tracks peers from server presence_update broadcasts.
 * Note: per-cursor positions need Monaco editor handles (not exposed by
 * CodeEditor), so remote cursors render as line badges from cursor payloads.
 */
export function useCollabRoom(roomId, user, onRemoteCode) {
  const [peers, setPeers] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const onRemoteCodeRef = useRef(onRemoteCode);
  onRemoteCodeRef.current = onRemoteCode;
  const myId = user?.id || user?._id || 'anon';

  useEffect(() => {
    if (!roomId || !user) return;
    let ws;
    try {
      ws = new WebSocket(`${WS_BASE}/ws/session/${encodeURIComponent(roomId)}`);
    } catch {
      return;
    }
    wsRef.current = ws;
    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ kind: 'hello', user: { id: myId, name: user.name || user.email } }));
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'presence_update' && Array.isArray(msg.users)) {
          setPeers(msg.users);
        } else if (msg.type === 'session_update' && msg.data?.sender !== myId) {
          if (typeof msg.data?.code === 'string') onRemoteCodeRef.current?.(msg.data.code);
          setPeers((prev) => {
            const u = msg.data?.user;
            if (!u || prev.some((p) => (p.id || p.name) === (u.id || u.name))) return prev;
            return [...prev, u];
          });
        }
      } catch {
        /* ignore malformed frames */
      }
    };
    ws.onclose = () => setConnected(false);
    return () => {
      try { ws.close(); } catch { /* noop */ }
      wsRef.current = null;
    };
  }, [roomId, user, myId]);

  const timer = useRef(null);
  const sendCode = (code) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          kind: 'code',
          sender: myId,
          user: { id: myId, name: user?.name || user?.email },
          code,
        }));
      }
    }, 600);
  };

  return { peers, connected, sendCode };
}
