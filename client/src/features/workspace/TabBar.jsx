import React from 'react';
import { X, FileCode } from 'lucide-react';

export default function TabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose
}) {
  if (!tabs || tabs.length === 0) {
    return (
      <div className="flex bg-black/40 border-b overflow-x-auto h-9 shrink-0 items-center px-2 text-xs opacity-50" style={{ borderColor: 'var(--border-color, #334155)' }}>
        No files open
      </div>
    );
  }

  return (
    <div className="flex bg-black/40 border-b overflow-x-auto h-9 shrink-0 select-none hide-scrollbar" style={{ borderColor: 'var(--border-color, #334155)' }}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onTabSelect(tab.id)}
            className={`
              flex items-center group cursor-pointer border-r px-3 min-w-[120px] max-w-[200px]
              transition-colors
              ${isActive ? 'bg-teal-900/20 text-teal-300 border-b-2 border-b-teal-500' : 'hover:bg-white/5 opacity-70'}
            `}
            style={{
              borderColor: 'var(--border-color, #334155)',
              borderBottomColor: isActive ? '#14b8a6' : 'transparent'
            }}
          >
            <span className="mr-2 opacity-70">
              <FileCode size={12} />
            </span>
            <span className="truncate flex-1 text-xs" title={tab.path}>
              {tab.name}
            </span>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              className="ml-2 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

