import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FileExplorer = ({ 
  files, 
  activeFileId, 
  onFileSelect, 
  onFileCreate, 
  onFileImport, 
  onFileDelete, 
  onFileRename,
  collapsed = false,
  onToggleCollapse 
}) => {
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [newFileLanguage, setNewFileLanguage] = useState('javascript');
  const [editingFileId, setEditingFileId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const languageOptions = [
    { value: 'javascript', label: 'JavaScript', ext: '.js', icon: '📜' },
    { value: 'typescript', label: 'TypeScript', ext: '.ts', icon: '📘' },
    { value: 'python', label: 'Python', ext: '.py', icon: '🐍' },
    { value: 'java', label: 'Java', ext: '.java', icon: '☕' },
    { value: 'cpp', label: 'C++', ext: '.cpp', icon: '⚙️' },
    { value: 'c', label: 'C', ext: '.c', icon: '🔧' },
    { value: 'csharp', label: 'C#', ext: '.cs', icon: '🎯' },
    { value: 'go', label: 'Go', ext: '.go', icon: '🐹' },
    { value: 'rust', label: 'Rust', ext: '.rs', icon: '🦀' },
    { value: 'php', label: 'PHP', ext: '.php', icon: '🐘' },
    { value: 'ruby', label: 'Ruby', ext: '.rb', icon: '💎' },
    { value: 'swift', label: 'Swift', ext: '.swift', icon: '🍎' },
    { value: 'kotlin', label: 'Kotlin', ext: '.kt', icon: '🎨' },
    { value: 'html', label: 'HTML', ext: '.html', icon: '🌐' },
    { value: 'css', label: 'CSS', ext: '.css', icon: '🎨' },
    { value: 'json', label: 'JSON', ext: '.json', icon: '📋' },
    { value: 'sql', label: 'SQL', ext: '.sql', icon: '🗄️' },
    { value: 'plaintext', label: 'Text', ext: '.txt', icon: '📄' },
  ];

  const getFileIcon = (item) => {
    if (item.isFolder) return '📁';
    const lang = languageOptions.find(l => l.value === item.language);
    return lang?.icon || '📄';
  };

  const handleCreateFile = () => {
    if (!newFileName.trim()) return;
    const lang = languageOptions.find(l => l.value === newFileLanguage);
    const ext = lang?.ext || '.txt';
    const fileName = newFileName.includes('.') ? newFileName : newFileName + ext;
    onFileCreate({ name: fileName, language: newFileLanguage, content: '', isFolder: false });
    setNewFileName('');
    setNewFileLanguage('javascript');
    setShowNewFileModal(false);
    setShowCreateMenu(false);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    onFileCreate({ name: newFolderName.trim(), isFolder: true, children: [] });
    setNewFolderName('');
    setShowNewFolderModal(false);
    setShowCreateMenu(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (!items) {
      // Fallback for files only
      const droppedFiles = Array.from(e.dataTransfer.files);
      droppedFiles.forEach(file => processFile(file));
      return;
    }

    // Process items (can include folders)
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.webkitGetAsEntry) {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          await processEntry(entry, '');
        }
      } else if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) processFile(file);
      }
    }
  };

  const processEntry = async (entry, path) => {
    if (entry.isFile) {
      return new Promise((resolve) => {
        entry.file((file) => {
          processFile(file, path);
          resolve();
        });
      });
    } else if (entry.isDirectory) {
      // Create folder
      onFileImport({ 
        name: entry.name, 
        path: path + entry.name,
        isFolder: true, 
        children: [] 
      });
      
      // Read directory contents
      const dirReader = entry.createReader();
      return new Promise((resolve) => {
        dirReader.readEntries(async (entries) => {
          for (const childEntry of entries) {
            await processEntry(childEntry, path + entry.name + '/');
          }
          resolve();
        });
      });
    }
  };

  const processFile = (file, path = '') => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const extension = file.name.split('.').pop().toLowerCase();
      const langMap = {
        js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
        py: 'python', java: 'java', cpp: 'cpp', c: 'c', cs: 'csharp',
        go: 'go', rs: 'rust', php: 'php', rb: 'ruby', swift: 'swift',
        kt: 'kotlin', html: 'html', css: 'css', json: 'json', sql: 'sql'
      };
      const language = langMap[extension] || 'plaintext';
      onFileImport({ 
        name: file.name, 
        path: path + file.name,
        language, 
        content, 
        isFolder: false 
      });
    };
    reader.readAsText(file);
  };

  const handleFileUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files);
    uploadedFiles.forEach(file => processFile(file));
    e.target.value = '';
  };

  const handleFolderUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files);
    const processedFolders = new Set();
    
    uploadedFiles.forEach(file => {
      const pathParts = file.webkitRelativePath.split('/');
      const folderName = pathParts[0];
      
      // Create folder entry if not exists
      if (!processedFolders.has(folderName)) {
        processedFolders.add(folderName);
        onFileImport({ 
          name: folderName, 
          isFolder: true, 
          children: [] 
        });
      }
      
      // Process file
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        const extension = file.name.split('.').pop().toLowerCase();
        const langMap = {
          js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
          py: 'python', java: 'java', cpp: 'cpp', c: 'c', cs: 'csharp',
          go: 'go', rs: 'rust', php: 'php', rb: 'ruby', swift: 'swift',
          kt: 'kotlin', html: 'html', css: 'css', json: 'json', sql: 'sql'
        };
        const language = langMap[extension] || 'plaintext';
        onFileImport({ 
          name: file.name, 
          path: file.webkitRelativePath,
          language, 
          content, 
          isFolder: false,
          parentFolder: folderName
        });
      };
      reader.readAsText(file);
    });
    
    e.target.value = '';
  };

  const handleContextMenu = (e, file) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  const handleRename = (fileId) => {
    const file = files.find(f => f.id === fileId);
    setEditingFileId(fileId);
    setEditingName(file.name);
    setContextMenu(null);
  };

  const submitRename = () => {
    if (editingName.trim() && editingFileId) {
      onFileRename(editingFileId, editingName.trim());
    }
    setEditingFileId(null);
    setEditingName('');
  };

  const toggleFolder = (folderId) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Separate folders and files
  const folders = files.filter(f => f.isFolder);
  const regularFiles = files.filter(f => !f.isFolder);

  return (
    <>
      <div 
        className={`flex flex-col h-full transition-all duration-300 relative ${collapsed ? 'w-12' : 'w-64'}`}
        style={{ background: 'var(--card-bg)', borderRight: '1px solid var(--card-border)' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag & Drop Overlay */}
        <AnimatePresence>
          {isDragging && !collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex items-center justify-center bg-teal-500/20 backdrop-blur-sm border-2 border-dashed border-teal-500 rounded-lg"
            >
              <div className="text-center">
                <div className="text-4xl mb-2">📂</div>
                <p className="text-sm font-medium text-teal-400">Drop files or folders here</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
          {!collapsed && (
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Explorer</span>
          )}
          <div className="flex items-center gap-1">
            {!collapsed && (
              <>
                {/* Create Menu Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowCreateMenu(!showCreateMenu)}
                    className="p-1.5 rounded hover:bg-teal-500/20 transition-colors"
                    title="New..."
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  
                  {/* Create Dropdown Menu */}
                  <AnimatePresence>
                    {showCreateMenu && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowCreateMenu(false)} />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          className="absolute right-[-8px] top-12 z-[100] w-52 rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.6)] overflow-hidden"
                          style={{ background: 'var(--card-bg-solid, var(--surface-2))', border: '1px solid var(--accent-cyan)', backdropFilter: 'blur(25px)' }}
                        >
                          <button
                            onClick={() => { setShowNewFileModal(true); setShowCreateMenu(false); }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-teal-500/20 transition-colors flex items-center gap-2"
                            style={{ color: 'var(--fg-color)' }}
                          >
                            <span>📄</span> New File
                          </button>
                          <button
                            onClick={() => { setShowNewFolderModal(true); setShowCreateMenu(false); }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-teal-500/20 transition-colors flex items-center gap-2"
                            style={{ color: 'var(--fg-color)' }}
                          >
                            <span>📁</span> New Folder
                          </button>
                          <div className="h-px" style={{ background: 'var(--card-border)' }} />
                          <button
                            onClick={() => { fileInputRef.current?.click(); setShowCreateMenu(false); }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-teal-500/20 transition-colors flex items-center gap-2"
                            style={{ color: 'var(--fg-color)' }}
                          >
                            <span>📥</span> Import Files
                          </button>
                          <button
                            onClick={() => { folderInputRef.current?.click(); setShowCreateMenu(false); }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-teal-500/20 transition-colors flex items-center gap-2"
                            style={{ color: 'var(--fg-color)' }}
                          >
                            <span>📂</span> Import Folder
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded hover:bg-teal-500/20 transition-colors"
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              <svg className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.cs,.go,.rs,.php,.rb,.swift,.kt,.html,.css,.json,.sql,.txt"
          onChange={handleFileUpload}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          webkitdirectory=""
          directory=""
          multiple
          onChange={handleFolderUpload}
          className="hidden"
        />

        {/* Files List */}
        {!collapsed && (
          <div className="flex-1 overflow-auto py-2">
            {files.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="text-3xl mb-2">📁</div>
                <p className="text-xs text-muted mb-2">No files yet</p>
                <p className="text-xs text-muted mb-3">Drag & drop files/folders here</p>
                <button
                  onClick={() => setShowCreateMenu(true)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-500"
                >
                  Create or Import
                </button>
              </div>
            ) : (
              <div className="space-y-0.5">
                {/* Folders first */}
                {folders.map((folder) => (
                  <div key={folder.id}>
                    <div
                      onClick={() => toggleFolder(folder.id)}
                      onContextMenu={(e) => handleContextMenu(e, folder)}
                      className="group flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors hover:bg-white/5"
                    >
                      <span className="text-xs text-muted">
                        {expandedFolders.has(folder.id) ? '▼' : '▶'}
                      </span>
                      <span className="text-sm">📁</span>
                      {editingFileId === folder.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={submitRename}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') submitRename();
                            if (e.key === 'Escape') { setEditingFileId(null); setEditingName(''); }
                          }}
                          autoFocus
                          className="flex-1 text-xs px-1 py-0.5 rounded bg-transparent border border-teal-500 outline-none"
                          style={{ color: 'var(--fg-color)' }}
                        />
                      ) : (
                        <span className="flex-1 text-xs font-medium" style={{ color: 'var(--fg-color)' }}>{folder.name}</span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); onFileDelete(folder.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 transition-all"
                        title="Delete"
                      >
                        <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Regular files */}
                {regularFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => onFileSelect(file.id)}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                    className={`group flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors ${
                      activeFileId === file.id 
                        ? 'bg-teal-500/20 border-l-2 border-teal-500' 
                        : 'hover:bg-white/5 border-l-2 border-transparent'
                    }`}
                  >
                    <span className="text-sm">{getFileIcon(file)}</span>
                    {editingFileId === file.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={submitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitRename();
                          if (e.key === 'Escape') { setEditingFileId(null); setEditingName(''); }
                        }}
                        autoFocus
                        className="flex-1 text-xs px-1 py-0.5 rounded bg-transparent border border-teal-500 outline-none"
                        style={{ color: 'var(--fg-color)' }}
                      />
                    ) : (
                      <span className="flex-1 text-xs truncate" style={{ color: 'var(--fg-color)' }}>{file.name}</span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); onFileDelete(file.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 transition-all"
                      title="Delete"
                    >
                      <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Collapsed state */}
        {collapsed && (
          <div className="flex-1 flex flex-col items-center py-4 gap-2">
            <button
              onClick={() => setShowCreateMenu(true)}
              className="p-2 rounded hover:bg-teal-500/20 transition-colors"
              title="New..."
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <div className="w-6 h-px bg-gray-700 my-2" />
            {files.slice(0, 5).map((file) => (
              <button
                key={file.id}
                onClick={() => file.isFolder ? toggleFolder(file.id) : onFileSelect(file.id)}
                className={`p-2 rounded transition-colors ${activeFileId === file.id ? 'bg-teal-500/20' : 'hover:bg-white/5'}`}
                title={file.name}
              >
                <span className="text-sm">{getFileIcon(file)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed z-50 rounded-lg shadow-xl overflow-hidden"
              style={{ 
                left: contextMenu.x, 
                top: contextMenu.y,
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)'
              }}
            >
              <button
                onClick={() => handleRename(contextMenu.file.id)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-teal-500/20 transition-colors flex items-center gap-2"
                style={{ color: 'var(--fg-color)' }}
              >
                <span>✏️</span> Rename
              </button>
              <button
                onClick={() => { onFileDelete(contextMenu.file.id); setContextMenu(null); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-red-500/20 transition-colors flex items-center gap-2 text-red-400"
              >
                <span>🗑️</span> Delete
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* New File Modal */}
      <AnimatePresence>
        {showNewFileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm"
            onClick={() => setShowNewFileModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-2xl"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--fg-color)' }}>
                📄 Create New File
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-muted mb-1">File Name</label>
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="Enter file name..."
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--bg-color)', border: '1px solid var(--card-border)', color: 'var(--fg-color)' }}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-muted mb-1">Language</label>
                  <select
                    value={newFileLanguage}
                    onChange={(e) => setNewFileLanguage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--bg-color)', border: '1px solid var(--card-border)', color: 'var(--fg-color)' }}
                  >
                    {languageOptions.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.icon} {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowNewFileModal(false)}
                  className="px-4 py-2 rounded-lg text-sm transition-colors"
                  style={{ background: 'var(--bg-color)', color: 'var(--fg-color)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFile}
                  disabled={!newFileName.trim()}
                  className="px-4 py-2 rounded-lg text-sm bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Folder Modal */}
      <AnimatePresence>
        {showNewFolderModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm"
            onClick={() => setShowNewFolderModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-2xl"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--fg-color)' }}>
                📁 Create New Folder
              </h3>
              
              <div>
                <label className="block text-xs text-muted mb-1">Folder Name</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name..."
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--bg-color)', border: '1px solid var(--card-border)', color: 'var(--fg-color)' }}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-4 py-2 rounded-lg text-sm transition-colors"
                  style={{ background: 'var(--bg-color)', color: 'var(--fg-color)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="px-4 py-2 rounded-lg text-sm bg-teal-600 text-white hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FileExplorer;
