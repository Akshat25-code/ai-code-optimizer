import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, Folder, FileCode, ChevronRight, Search, X, Loader2, GitBranch, Eye, Check } from 'lucide-react';

const GitHubRepoModal = ({ isOpen, onClose, onFileSelect, onImport }) => {
  const [repos, setRepos] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedRepo, setSelectedRepo] = useState(null);

  // Branch state
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);

  // Diff preview state
  const [pendingFile, setPendingFile] = useState(null); // {item, content}
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffResult, setDiffResult] = useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001';

  useEffect(() => {
    if (isOpen) {
      fetchRepos();
      // Reset state
      setSelectedRepo(null);
      setCurrentPath([]);
      setContents([]);
      setBranches([]);
      setSelectedBranch('');
      setPendingFile(null);
      setDiffResult(null);
      setError(null);
    }
  }, [isOpen]);

  const fetchRepos = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/github/repos`, { credentials: 'include' });
      if (!resp.ok) throw new Error('Failed to fetch repositories. Make sure you logged in with GitHub.');
      const data = await resp.json();
      setRepos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async (repoFullName) => {
    setLoadingBranches(true);
    try {
      const [owner, repo] = repoFullName.split('/');
      const resp = await fetch(`${API_BASE}/github/repos/${owner}/${repo}/branches`, { credentials: 'include' });
      if (!resp.ok) throw new Error('Failed to fetch branches');
      const data = await resp.json();
      setBranches(data.branches || []);
      setDefaultBranch(data.default_branch || 'main');
      setSelectedBranch(data.default_branch || 'main');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingBranches(false);
    }
  };

  const fetchContents = async (repo, path = '', branch = '') => {
    setLoading(true);
    setError(null);
    try {
      const [owner, repoName] = repo.split('/');
      const ref = branch || selectedBranch;
      const refParam = ref ? `&ref=${encodeURIComponent(ref)}` : '';
      const resp = await fetch(
        `${API_BASE}/github/repos/${owner}/${repoName}/contents?path=${path}${refParam}`,
        { credentials: 'include' }
      );
      if (!resp.ok) throw new Error('Failed to fetch contents');
      const data = await resp.json();
      setContents(Array.isArray(data) ? data : [data]);
      setSelectedRepo(repo);
      if (path === '') setCurrentPath([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRepoClick = async (repoFullName) => {
    await fetchBranches(repoFullName);
    await fetchContents(repoFullName, '', '');
  };

  const handleBranchChange = async (branch) => {
    setSelectedBranch(branch);
    setBranchMenuOpen(false);
    setCurrentPath([]);
    setContents([]);
    setPendingFile(null);
    setDiffResult(null);
    await fetchContents(selectedRepo, '', branch);
  };

  const handleContentClick = (item) => {
    if (item.type === 'dir') {
      const newPath = [...currentPath, item.name];
      setCurrentPath(newPath);
      fetchContents(selectedRepo, newPath.join('/'));
    } else {
      handleFileSelect(item);
    }
  };

  const handleFileSelect = async (item) => {
    setLoading(true);
    try {
      const [owner, repoName] = selectedRepo.split('/');
      const refParam = selectedBranch ? `&ref=${encodeURIComponent(selectedBranch)}` : '';
      const resp = await fetch(
        `${API_BASE}/github/repos/${owner}/${repoName}/file?path=${item.path}${refParam}`,
        { credentials: 'include' }
      );
      if (!resp.ok) throw new Error('Failed to fetch file content');
      const { content } = await resp.json();
      setPendingFile({ item, content });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchDiff = async () => {
    if (!pendingFile) return;
    setDiffLoading(true);
    setDiffResult(null);
    try {
      const [owner, repoName] = selectedRepo.split('/');
      const resp = await fetch(
        `${API_BASE}/github/repos/${owner}/${repoName}/diff-preview`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_path: pendingFile.item.path,
            new_content: pendingFile.content,
            ref: selectedBranch || defaultBranch,
          }),
        }
      );
      if (!resp.ok) throw new Error('Failed to generate diff');
      const data = await resp.json();
      setDiffResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setDiffLoading(false);
    }
  };

  const handleConfirmImport = () => {
    if (!pendingFile) return;
    const importHandler = onFileSelect || onImport;
    if (!importHandler) return;
    importHandler(pendingFile.content, pendingFile.item.name, {
      repo: selectedRepo,
      path: pendingFile.item.path,
      branch: selectedBranch,
    });
    onClose();
  };

  const goBack = () => {
    setPendingFile(null);
    setDiffResult(null);
    if (currentPath.length === 0) {
      setSelectedRepo(null);
      setContents([]);
      setBranches([]);
    } else {
      const newPath = currentPath.slice(0, -1);
      setCurrentPath(newPath);
      fetchContents(selectedRepo, newPath.join('/'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Github size={20} />
            </div>
            <div>
              <h3 className="font-bold">Import from GitHub</h3>
              <p className="text-xs text-slate-400">
                {selectedRepo
                  ? `${selectedRepo} Â· ${selectedBranch || defaultBranch}`
                  : 'Select a repository'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition"><X size={20} /></button>
        </div>

        {/* Branch selector bar (only visible after repo selected) */}
        {selectedRepo && !pendingFile && (
          <div className="px-5 py-2 border-b border-white/5 flex items-center gap-3 flex-shrink-0 bg-slate-900/50">
            <GitBranch size={14} className="text-slate-400" />
            <span className="text-xs text-slate-400">Branch:</span>
            <div className="relative">
              <button
                onClick={() => setBranchMenuOpen(b => !b)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 bg-indigo-500/15 text-indigo-300 rounded-lg border border-indigo-500/25 hover:bg-indigo-500/25 transition"
              >
                {loadingBranches ? <Loader2 size={12} className="animate-spin" /> : <GitBranch size={12} />}
                {selectedBranch || defaultBranch}
                <ChevronRight size={12} className={`transition-transform ${branchMenuOpen ? 'rotate-90' : ''}`} />
              </button>
              <AnimatePresence>
                {branchMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                    className="absolute top-full left-0 mt-1 w-56 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto"
                  >
                    {branches.map(b => (
                      <button
                        key={b.name}
                        onClick={() => handleBranchChange(b.name)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-white/5 transition text-left"
                      >
                        <span className={b.name === selectedBranch ? 'text-indigo-400 font-semibold' : 'text-slate-300'}>
                          {b.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {b.is_default && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">default</span>
                          )}
                          {b.name === selectedBranch && <Check size={12} className="text-indigo-400" />}
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <span className="text-xs text-slate-500">/{currentPath.join('/')}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Loader2 className="animate-spin" size={32} />
              <span>Fetching from GitHub...</span>
            </div>
          )}

          {/* Repo list */}
          {!loading && !selectedRepo && (
            <div className="space-y-2">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text" placeholder="Search repositories..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                />
              </div>
              {repos
                .filter(r => r.full_name.toLowerCase().includes(search.toLowerCase()))
                .map(repo => (
                  <button
                    key={repo.id}
                    onClick={() => handleRepoClick(repo.full_name)}
                    className="w-full p-4 flex items-center justify-between rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/10 transition group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="text-indigo-400" size={20} />
                      <div>
                        <div className="font-medium text-sm">{repo.name}</div>
                        <div className="text-xs text-slate-500">{repo.full_name} Â· {repo.default_branch || 'main'}</div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-500 group-hover:text-white transition" />
                  </button>
                ))}
            </div>
          )}

          {/* File picker */}
          {!loading && selectedRepo && !pendingFile && (
            <div className="space-y-1">
              <button onClick={goBack} className="flex items-center gap-2 text-xs text-indigo-400 mb-4 hover:underline">
                â† Back to {currentPath.length > 0 ? currentPath[currentPath.length - 1] : 'Repositories'}
              </button>
              {contents.map(item => (
                <button
                  key={item.sha}
                  onClick={() => handleContentClick(item)}
                  className="w-full p-3 flex items-center justify-between rounded-xl hover:bg-white/5 transition group text-left"
                >
                  <div className="flex items-center gap-3">
                    {item.type === 'dir'
                      ? <Folder className="text-amber-400" size={18} />
                      : <FileCode className="text-indigo-400" size={18} />}
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-500 opacity-0 group-hover:opacity-100 transition" />
                </button>
              ))}
              {contents.length === 0 && (
                <div className="text-center py-10 text-slate-500 text-sm italic">This folder is empty</div>
              )}
            </div>
          )}

          {/* File preview & diff */}
          {pendingFile && (
            <div className="space-y-4">
              <button onClick={goBack} className="flex items-center gap-2 text-xs text-indigo-400 hover:underline">
                â† Back to file browser
              </button>

              {/* File info card */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <FileCode className="text-indigo-400" size={20} />
                  <div>
                    <div className="font-semibold text-sm">{pendingFile.item.name}</div>
                    <div className="text-xs text-slate-400">{pendingFile.item.path} Â· {selectedBranch || defaultBranch}</div>
                  </div>
                </div>
                <pre className="text-[11px] font-mono bg-slate-950 rounded-lg p-3 max-h-40 overflow-auto text-slate-300 whitespace-pre-wrap">
                  {pendingFile.content.slice(0, 1000)}{pendingFile.content.length > 1000 ? '\n...(truncated)' : ''}
                </pre>
              </div>

              {/* Diff section */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold flex items-center gap-2">
                    <Eye size={16} className="text-teal-400" /> Diff Preview
                  </span>
                  <button
                    onClick={handleFetchDiff}
                    disabled={diffLoading}
                    className="text-xs px-3 py-1.5 rounded-lg bg-teal-500/15 text-teal-400 hover:bg-teal-500/25 border border-teal-500/25 transition disabled:opacity-50"
                  >
                    {diffLoading ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
                    {diffLoading ? 'Loading...' : 'Preview Changes'}
                  </button>
                </div>
                {diffResult && (
                  <div className="space-y-2">
                    <div className="flex gap-3 text-xs">
                      <span className="text-emerald-400">+{diffResult.additions} additions</span>
                      <span className="text-red-400">-{diffResult.deletions} deletions</span>
                      <span className="text-slate-400">on branch: {diffResult.ref}</span>
                    </div>
                    {diffResult.diff && (
                      <pre className="text-[10px] font-mono bg-slate-950 rounded-lg p-3 max-h-40 overflow-auto whitespace-pre-wrap">
                        {diffResult.diff.split('\n').map((line, i) => (
                          <span
                            key={i}
                            className={`block ${line.startsWith('+') && !line.startsWith('+++') ? 'text-emerald-400' : line.startsWith('-') && !line.startsWith('---') ? 'text-red-400' : line.startsWith('@@') ? 'text-blue-400' : 'text-slate-400'}`}
                          >
                            {line}
                          </span>
                        ))}
                      </pre>
                    )}
                    {!diffResult.has_changes && (
                      <div className="text-xs text-slate-400 italic">No changes compared to branch.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleConfirmImport}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm rounded-xl hover:opacity-90 transition"
                >
                  Import File into Editor
                </button>
                <button
                  onClick={() => { setPendingFile(null); setDiffResult(null); }}
                  className="px-4 py-3 rounded-xl text-sm text-slate-400 hover:bg-white/5 border border-white/10 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default GitHubRepoModal;

