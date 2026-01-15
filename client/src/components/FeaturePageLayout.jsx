import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import CodeEditor from './CodeEditor';
import FileExplorer from './FileExplorer';

// File drop zone component for importing files and folders
const FileDropZone = ({ onFileImport, showFileExplorer }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processEntry = async (entry, path = '') => {
    if (entry.isFile) {
      return new Promise((resolve) => {
        entry.file((file) => {
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
            onFileImport({ name: file.name, path: path + file.name, language, content, isFolder: false });
            resolve();
          };
          reader.readAsText(file);
        });
      });
    } else if (entry.isDirectory) {
      onFileImport({ name: entry.name, path: path + entry.name, isFolder: true, children: [] });
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

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const items = e.dataTransfer.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) {
          await processEntry(entry);
        }
      }
    } else {
      // Fallback for files only
      const files = Array.from(e.dataTransfer.files);
      files.forEach(file => {
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
          onFileImport({ name: file.name, language, content, isFolder: false });
        };
        reader.readAsText(file);
      });
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
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
        onFileImport({ name: file.name, language, content, isFolder: false });
      };
      reader.readAsText(file);
    });
    e.target.value = '';
  };

  const handleFolderSelect = (e) => {
    const files = Array.from(e.target.files);
    const processedFolders = new Set();
    
    files.forEach(file => {
      const pathParts = file.webkitRelativePath.split('/');
      const folderName = pathParts[0];
      
      if (!processedFolders.has(folderName)) {
        processedFolders.add(folderName);
        onFileImport({ name: folderName, isFolder: true, children: [] });
      }
      
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
        onFileImport({ name: file.name, path: file.webkitRelativePath, language, content, isFolder: false, parentFolder: folderName });
      };
      reader.readAsText(file);
    });
    e.target.value = '';
  };

  if (!showFileExplorer) return null;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`px-4 py-2 rounded-lg border border-dashed flex items-center justify-between transition-all ${
        isDragging 
          ? 'border-teal-500 bg-teal-500/10' 
          : 'border-gray-600 hover:border-teal-500/50'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.cs,.go,.rs,.php,.rb,.swift,.kt,.html,.css,.json,.sql,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleFolderSelect}
        className="hidden"
      />
      <div className="flex items-center gap-2">
        <span className="text-lg">📂</span>
        <span className="text-xs text-muted">
          {isDragging ? 'Drop here!' : 'Drag & drop or'}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          className="text-xs px-2 py-1 rounded transition-colors hover:bg-teal-500/20"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--fg-color)' }}
        >
          📄 Import Files
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
          className="text-xs px-2 py-1 rounded transition-colors hover:bg-teal-500/20"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--fg-color)' }}
        >
          📁 Import Folder
        </button>
      </div>
    </div>
  );
};

// CSS-only ambient background
const AmbientBackground = ({ color1 = 'teal', color2 = 'emerald' }) => (
  <>
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className={`pointer-events-none absolute -top-40 -right-32 w-[40rem] h-[40rem] rounded-full bg-${color1}-500/15 blur-3xl`}
    />
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.1 }}
      className={`pointer-events-none absolute -bottom-40 -left-32 w-[40rem] h-[40rem] rounded-full bg-${color2}-500/15 blur-3xl`}
    />
  </>
);

// Sanitize AI explanation
const sanitizeProfessional = (text) => {
  if (!text) return '';
  return text
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/\*\*/g, '')
    .replace(/[#*_~`]/g, '')
    .trim();
};

const FeaturePageLayout = ({
  // Page info
  title,
  subtitle,
  icon,
  accentColor = 'teal',
  
  // Hook data
  code, setCode,
  language, setLanguage,
  supportedLanguages,
  aiProvider, setAiProvider,
  isOptimizing,
  progressStep,
  error,
  backendHealthy,
  toast, setToast,
  showAuthModal, setShowAuthModal,
  resolvedEditorLanguage,
  
  // File manager (optional)
  files,
  activeFileId,
  explorerCollapsed,
  onFileSelect,
  onFileCreate,
  onFileImport,
  onFileDelete,
  onFileRename,
  onToggleExplorerCollapse,
  showFileExplorer = false,
  
  // Handlers
  handleProcess,
  handleClear,
  
  // Action button
  actionLabel = 'Process',
  actionIcon = '⚡',
  
  // Custom sections
  optionsSection,
  resultsSection,
  
  // Optional
  user,
}) => {
  const navigate = useNavigate();
  const [professionalMode, setProfessionalMode] = React.useState(true);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--bg-color)' }}>
      <AmbientBackground color1={accentColor} color2="emerald" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pt-20">
        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl shadow-lg ${
                toast.type === 'success' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-red-600 text-white'
              }`}
            >
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compact Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3 mb-4"
        >
          <span className="text-2xl">{icon}</span>
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--fg-color)' }}>
            {title}
          </h1>
        </motion.div>

        {/* Backend Status */}
        {backendHealthy === false && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-center"
          >
            <span className="text-red-400">⚠️ Backend server is not responding. Please ensure the server is running.</span>
          </motion.div>
        )}

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 p-4 rounded-xl bg-red-500/20 border border-red-500/40"
          >
            <span className="text-red-400">{error}</span>
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className="flex gap-6">
          {/* File Explorer Sidebar */}
          {showFileExplorer && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              className="flex-shrink-0 rounded-xl overflow-hidden"
              style={{ 
                background: 'var(--card-bg)', 
                border: '1px solid var(--card-border)',
                height: 'calc(100vh - 180px)',
                minHeight: '500px',
              }}
            >
              <FileExplorer
                files={files}
                activeFileId={activeFileId}
                onFileSelect={onFileSelect}
                onFileCreate={onFileCreate}
                onFileImport={onFileImport}
                onFileDelete={onFileDelete}
                onFileRename={onFileRename}
                collapsed={explorerCollapsed}
                onToggleCollapse={onToggleExplorerCollapse}
              />
            </motion.div>
          )}

          {/* Main Content */}
          <div className={`flex-1 grid ${showFileExplorer ? 'lg:grid-cols-2' : 'lg:grid-cols-2'} gap-6`}>
          {/* Left Panel - Input */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            {/* Controls Bar */}
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
              {/* Language Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted">Language:</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-sm"
                  style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)`, color: 'var(--fg-color)' }}
                >
                  <option value="auto">Auto-detect</option>
                  {supportedLanguages.map((lang) => (
                    <option key={lang.key} value={lang.key}>{lang.name}</option>
                  ))}
                </select>
              </div>

              {/* AI Provider */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted">AI:</label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="px-3 py-1.5 rounded-lg text-sm"
                  style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)`, color: 'var(--fg-color)' }}
                >
                  <option value="auto">Auto</option>
                  <option value="openai">OpenAI</option>
                  <option value="claude">Claude</option>
                  <option value="gemini">Gemini</option>
                </select>
              </div>
            </div>

            {/* File Import Drop Zone */}
            <FileDropZone onFileImport={onFileImport} showFileExplorer={showFileExplorer} />

            {/* Custom Options Section */}
            {optionsSection}

            {/* Code Editor */}
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)` }}>
              <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: `1px solid var(--card-border)` }}>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--fg-color)' }}>📝 Input Code</h3>
                <span className="text-xs text-muted">{resolvedEditorLanguage}</span>
              </div>
              <div className="h-[500px]">
                <CodeEditor
                  value={code}
                  onChange={setCode}
                  language={resolvedEditorLanguage?.toLowerCase() || 'javascript'}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleProcess}
                disabled={isOptimizing || !code.trim()}
                className={`flex-1 py-3 px-6 rounded-xl font-semibold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-${accentColor}-600 to-emerald-500 hover:from-${accentColor}-500 hover:to-emerald-400`}
                style={{ background: isOptimizing ? undefined : `linear-gradient(135deg, #0d9488 0%, #10b981 100%)` }}
              >
                {isOptimizing ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      ⏳
                    </motion.span>
                    {progressStep || 'Processing...'}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {actionIcon} {actionLabel}
                  </span>
                )}
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-3 rounded-xl font-semibold transition-colors"
                style={{ background: 'var(--card-bg)', border: `1px solid var(--card-border)`, color: 'var(--fg-color)' }}
              >
                Clear
              </button>
            </div>
          </motion.div>

          {/* Right Panel - Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {resultsSection}
          </motion.div>
          </div>
        </div>

        {/* Back to Home Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8"
        >
          <button
            onClick={() => navigate('/')}
            className="text-sm text-muted hover:text-teal-400 transition-colors"
          >
            ← Back to Home
          </button>
        </motion.div>
      </div>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="p-8 rounded-2xl bg-gray-900 border border-gray-700 max-w-md text-center"
            >
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-4">Free Trial Complete!</h2>
              <p className="text-gray-300 mb-6">
                You've used your 2 free optimizations. Sign up to continue with unlimited access!
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="px-6 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => navigate('/auth', { state: { from: location.pathname } })}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 transition-all duration-200"
                >
                  Sign Up
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { FeaturePageLayout, sanitizeProfessional };
export default FeaturePageLayout;
