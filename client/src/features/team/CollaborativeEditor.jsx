import React, { useRef, useEffect } from 'react';
import CodeEditor from '@/components/editor/CodeEditor';
import { useAuth } from '@/contexts/AuthContext';

export default function CollaborativeEditor({
  code, setCode, language, readOnly, users = [], onCursorUpdate
}) {
  const { user: currentUser } = useAuth();

  // A simple implementation of remote cursors.
  // In a real Monaco environment, this would hook into editor.createDecorationsCollection()
  // Since we are mocking the visual, we will just pass down the props to the underlying CodeEditor
  // and render absolute positioned fake cursors over the container.

  const handleEditorChange = (val) => {
    if (!readOnly) {
      setCode(val);
    }
  };

  const handleCursorChange = (position) => {
    if (onCursorUpdate && !readOnly) {
      onCursorUpdate(position);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Remote Presence Indicators (Top Right) */}
      <div className="absolute top-2 right-4 z-10 flex items-center gap-1">
        {users.filter(u => u.id !== (currentUser?._id || currentUser?.id)).map((u) => (
          <div
            key={u.id}
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg border-2 border-slate-800"
            style={{ backgroundColor: u.color || '#6366f1' }}
            title={`${u.name} is viewing`}
          >
            {u.name?.charAt(0)}
          </div>
        ))}
      </div>

      <CodeEditor
        code={code}
        language={language}
        onChange={handleEditorChange}
        readOnly={readOnly}
        theme="vs-dark"
      />

      {/* Remote Cursors Overlay (Mock UI) */}
      {users.filter(u => u.id !== (currentUser?._id || currentUser?.id) && u.cursor).map(u => (
        <div
          key={`cursor-${u.id}`}
          className="absolute pointer-events-none flex flex-col items-start transition-all duration-100"
          style={{
            // Mocking position based on line/col is complex without Monaco's exact layout.
            // We'll place a badge in the top right to indicate they are editing line X
            top: `${Math.min(u.cursor.lineNumber * 20, 300)}px`,
            right: '20px',
            zIndex: 20
          }}
        >
          <div className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow" style={{ backgroundColor: u.color || '#6366f1' }}>
            {u.name} (L{u.cursor.lineNumber})
          </div>
        </div>
      ))}
    </div>
  );
}

