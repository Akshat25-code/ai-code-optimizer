import React, { useState } from 'react';
import { Search, ChevronRight, ChevronDown, Folder, FileCode, FolderOpen } from 'lucide-react';

function TreeNode({ node, level, expandedPaths, onToggle, onSelect, activePath }) {
  const isDir = node.type === 'directory';
  const isExpanded = expandedPaths.has(node.path);
  const isActive = activePath === node.path;

  const handleToggle = (e) => {
    e.stopPropagation();
    if (isDir) {
      onToggle(node.path);
    } else {
      onSelect(node.path, node.name, node.language);
    }
  };

  return (
    <div className="w-full">
      <div
        onClick={handleToggle}
        className={`flex items-center w-full py-1 px-2 cursor-pointer text-sm select-none transition-colors group
          ${isActive ? 'bg-teal-600/20 text-teal-300' : 'hover:bg-white/5'}
        `}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {isDir ? (
          <span className="mr-1 opacity-60 group-hover:opacity-100">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        ) : (
          <span className="w-[14px] mr-1 inline-block" />
        )}

        <span className="mr-2 opacity-70">
          {isDir ? (
            isExpanded ? <FolderOpen size={14} className="text-blue-400" /> : <Folder size={14} className="text-blue-400" />
          ) : (
            node.icon || <FileCode size={14} />
          )}
        </span>

        <span className="truncate flex-1 text-left">{node.name}</span>

        {/* Hover metadata (lines/size) could go here if we want */}
      </div>

      {isDir && isExpanded && node.children && (
        <div className="w-full">
          {node.children.map((child, i) => (
            <TreeNode
              key={child.path || i}
              node={child}
              level={level + 1}
              expandedPaths={expandedPaths}
              onToggle={onToggle}
              onSelect={onSelect}
              activePath={activePath}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectSidebar({
  tree,
  projectName,
  activePath,
  onFileSelect
}) {
  const [expandedPaths, setExpandedPaths] = useState(new Set(['']));
  const [searchQuery, setSearchQuery] = useState('');

  const toggleDir = (path) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Very basic search filter - recursively filter tree
  const filterTree = (nodes, query) => {
    if (!query) return nodes;

    return nodes.map(node => {
      if (node.type === 'directory') {
        const filteredChildren = filterTree(node.children || [], query);
        if (filteredChildren.length > 0) {
          return { ...node, children: filteredChildren };
        }
        return null;
      }

      if (node.name.toLowerCase().includes(query.toLowerCase())) {
        return node;
      }

      return null;
    }).filter(Boolean);
  };

  const filteredTree = filterTree(tree || [], searchQuery);

  return (
    <div className="flex flex-col h-full w-full border-r shrink-0" style={{ borderColor: 'var(--border-color, #334155)', background: 'var(--panel-bg, #0f172a)' }}>
      {/* Header */}
      <div className="p-3 border-b shrink-0 flex items-center justify-between" style={{ borderColor: 'var(--border-color, #334155)' }}>
        <h3 className="font-semibold text-sm truncate" title={projectName}>
          {projectName || 'Project Workspace'}
        </h3>
      </div>

      {/* Search */}
      <div className="p-2 border-b shrink-0" style={{ borderColor: 'var(--border-color, #334155)' }}>
        <div className="relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/20 border rounded px-7 py-1 text-xs outline-none focus:border-teal-500 transition-colors"
            style={{ borderColor: 'var(--border-color, #334155)' }}
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto py-2">
        {filteredTree.length === 0 ? (
          <div className="px-4 py-8 text-center opacity-50 text-xs">
            {searchQuery ? 'No matching files found.' : 'No files in project.'}
          </div>
        ) : (
          filteredTree.map((node, i) => (
            <TreeNode
              key={node.path || i}
              node={node}
              level={0}
              expandedPaths={expandedPaths}
              onToggle={toggleDir}
              onSelect={onFileSelect}
              activePath={activePath}
            />
          ))
        )}
      </div>
    </div>
  );
}

