import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import CodeEditor from '@/components/editor/CodeEditor';
import FileExplorer from '@/features/workspace/FileExplorer';

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
      className={`px-4 py-3 rounded-xl border border-dashed flex items-center justify-between transition-all ${
        isDragging
          ? 'border-[var(--accent-cyan)] bg-[var(--glow-cyan)]'
          : 'border-[var(--card-border)] hover:border-[var(--card-hover-border)] bg-[var(--surface-1)]'
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
      <div className="flex items-center gap-3">
        <span className="text-xl">ðŸ“„</span>
        <span className="text-sm text-muted">
          {isDragging ? 'Drop files here!' : 'Drag & drop files or'}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          className="text-xs px-3 py-1.5 rounded-lg transition-colors bg-[var(--surface-2)] border border-[var(--card-border)] hover:bg-[var(--glow-cyan)] hover:border-[var(--accent-cyan)] text-[var(--fg-color)]"
        >
          Import Files
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
          className="text-xs px-3 py-1.5 rounded-lg transition-colors bg-[var(--surface-2)] border border-[var(--card-border)] hover:bg-[var(--glow-cyan)] hover:border-[var(--accent-cyan)] text-[var(--fg-color)]"
        >
          Import Folder
        </button>
      </div>
    </div>
  );
};

// Ambient Background Layer
const AmbientBackground = () => (
  <>
    <div className="fixed inset-0 pointer-events-none z-0">
      <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-[var(--glow-cyan)] blur-[120px] mix-blend-screen opacity-50" />
      <div className="absolute top-[60%] -left-[10%] w-[40%] h-[40%] rounded-full bg-[var(--glow-emerald)] blur-[100px] mix-blend-screen opacity-40" />
    </div>
  </>
);

// Sanitize AI explanation
const sanitizeProfessional = (text) => {
  if (!text) return '';
  return Array.from(text)
    .filter((char) => char.charCodeAt(0) <= 127)
    .join('')
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
  actionIcon = 'âš¡',

  // Custom sections
  optionsSection,
  resultsSection,

  // Optional
  user,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[var(--bg-color)]">
      <AmbientBackground />

      <div className="relative z-10 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20">
        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className={`fixed bottom-8 right-8 z-50 px-5 py-3.5 rounded-xl shadow-2xl backdrop-blur-md border ${
                toast.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              } flex items-center gap-3`}
            >
              {toast.type === 'success' ? 'âœ“' : 'âš ï¸'} {toast.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-6 border-b border-[var(--card-border)] gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-2)] border border-[var(--card-border)] flex items-center justify-center text-2xl shadow-inner">
              {icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--fg-color)] tracking-tight">
                {title}
              </h1>
              {subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3 bg-[var(--surface-1)] p-1.5 rounded-xl border border-[var(--card-border)]">
             <button
                onClick={() => navigate('/')}
                className="px-4 py-2 text-sm font-medium rounded-lg text-muted hover:text-[var(--fg-color)] hover:bg-[var(--surface-2)] transition-all"
             >
                Home
             </button>
             <div className="w-px h-5 bg-[var(--border-strong)]" />
             <div className="px-4 py-2 text-sm font-medium text-[var(--accent-cyan)] bg-[var(--glow-cyan)] rounded-lg">
                Workspace
             </div>
          </div>
        </motion.div>

        {/* Status Alerts */}
        <AnimatePresence>
          {(backendHealthy === false || error) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3">
                <span className="text-red-400 mt-0.5">âš ï¸</span>
                <div className="text-sm text-red-400">
                  {backendHealthy === false && <p>Backend server is not responding. Please ensure the server is running.</p>}
                  {error && <p>{error}</p>}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Workspace Layout */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* OPTIONAL File Explorer Sidebar */}
          {showFileExplorer && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className={`flex-shrink-0 transition-all duration-300 ${explorerCollapsed ? 'w-12' : 'w-64'}`}
            >
              <div
                className="sticky top-24 rounded-2xl glass-frame shadow-xl"
                style={{ height: 'calc(100vh - 180px)', minHeight: '600px' }}
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
              </div>
            </motion.div>
          )}

          {/* Central Workspace Grid */}
          <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

            {/* â”€â”€â”€ LEFT PANEL: INPUT â”€â”€â”€ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex flex-col gap-5 sticky top-24"
            >
              {/* Controls Bar */}
              <div className="glass-frame p-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-4 bg-[var(--accent-cyan)] rounded-full mr-1" />
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="select text-sm font-medium bg-[var(--surface-2)]"
                  >
                    <option value="auto">Auto-detect</option>
                    {supportedLanguages?.map((lang) => (
                      <option key={lang.key} value={lang.key}>{lang.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2.5 ml-auto">
                  <div className="w-1.5 h-4 bg-purple-500 rounded-full mr-1" />
                  <label className="text-xs font-semibold text-muted uppercase tracking-wider">AI Core</label>
                  <select
                    value={aiProvider}
                    onChange={(e) => setAiProvider(e.target.value)}
                    className="select text-sm font-medium bg-[var(--surface-2)]"
                  >
                    <option value="auto">Auto-Select Best</option>
                    <option value="openai">OpenAI (GPT-4)</option>
                    <option value="claude">Anthropic (Claude)</option>
                    <option value="gemini">Google (Gemini)</option>
                  </select>
                </div>
              </div>

              {/* File Drop Area */}
              <FileDropZone onFileImport={onFileImport} showFileExplorer={showFileExplorer} />

              {/* Specific Feature Options (Injected via props) */}
              {optionsSection && (
                <div className="glass-frame p-5">
                  {optionsSection}
                </div>
              )}

              {/* Code Editor Frame */}
              <div className="glass-frame flex flex-col shadow-lg transition-all focus-within:shadow-[0_0_0_1px_var(--accent-cyan)]">
                <div className="glass-frame-header">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--fg-color)]">
                    <span className="text-[var(--accent-cyan)]">{'<>'}</span> Source Code
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-muted border border-[var(--card-border)] font-mono">
                      {resolvedEditorLanguage || language}
                    </span>
                  </div>
                </div>
                <div className="h-[450px] relative pb-2 bg-[var(--code-bg)]">
                  <CodeEditor
                    value={code}
                    onChange={setCode}
                    language={resolvedEditorLanguage?.toLowerCase() || 'javascript'}
                  />
                  {/* Glowing bottom edge */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent-cyan)] to-transparent opacity-20" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleClear}
                  disabled={isOptimizing}
                  className="btn-secondary px-6"
                >
                  Clear
                </button>
                <button
                  onClick={handleProcess}
                  disabled={isOptimizing || !code.trim()}
                  className="btn-primary flex-1 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {isOptimizing ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{progressStep || 'Processing...'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-lg">
                      <span className="group-hover:scale-110 transition-transform">{actionIcon}</span>
                      <span>{actionLabel}</span>
                    </div>
                  )}
                </button>
              </div>
            </motion.div>

            {/* â”€â”€â”€ RIGHT PANEL: RESULTS â”€â”€â”€ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="flex flex-col gap-5 h-full"
            >
              {resultsSection}
            </motion.div>

          </div>
        </div>
      </div>

      {/* Auth Modal (Premium Upgrade/Limit Reached) */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -20 }}
              className="p-8 rounded-2xl max-w-md w-full text-center relative overflow-hidden"
              style={{ background: 'var(--card-bg-solid)', border: '1px solid var(--card-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,245,212,0.1)' }}
            >
              {/* Premium Glow Effect */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--accent-gold)] via-[var(--accent-cyan)] to-[var(--accent-gold)] opacity-80" />

              <div className="w-16 h-16 rounded-full mx-auto mb-5 bg-[var(--glow-cyan)] flex items-center justify-center border border-[var(--accent-cyan)] text-2xl shadow-[0_0_20px_rgba(0,245,212,0.2)]">
                ðŸ’Ž
              </div>
              <h2 className="text-2xl font-bold mb-3 text-[var(--fg-color)]">Unlock Unlimited Access</h2>
              <p className="text-muted mb-8 leading-relaxed">
                You've experienced the power of AI optimization. Sign up now to continue refining your codebase without limits.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate('/auth', { state: { from: location.pathname } })}
                  className="w-full btn-primary py-3 text-base shadow-[0_0_20px_rgba(0,245,212,0.2)]"
                >
                  Sign Up & Continue
                </button>
                <button
                  onClick={() => setShowAuthModal(false)}
                  className="w-full btn-secondary py-3"
                >
                  Maybe Later
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

