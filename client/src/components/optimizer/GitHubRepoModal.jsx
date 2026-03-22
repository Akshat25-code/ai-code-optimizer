import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, Folder, FileCode, ChevronRight, Search, X, Loader2 } from 'lucide-react';

const GitHubRepoModal = ({ isOpen, onClose, onFileSelect }) => {
  const [repos, setRepos] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [contents, setContents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedRepo, setSelectedRepo] = useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8001';

  useEffect(() => {
    if (isOpen) {
      fetchRepos();
    }
  }, [isOpen]);

  const fetchRepos = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/github/repos`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!resp.ok) throw new Error('Failed to fetch repositories. Make sure you logged in with GitHub.');
      const data = await resp.json();
      setRepos(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchContents = async (repo, path = '') => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`${API_BASE}/github/repos/${repo}/contents?path=${path}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
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

  const handleRepoClick = (repoFullName) => {
    fetchContents(repoFullName);
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
      const resp = await fetch(`${API_BASE}/github/repos/${selectedRepo}/file?path=${item.path}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!resp.ok) throw new Error('Failed to fetch file content');
      const { content } = await resp.json();
      onFileSelect(content, item.name);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (currentPath.length === 0) {
      setSelectedRepo(null);
      setContents([]);
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
        className="w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[80vh]"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Github size={20} />
            </div>
            <div>
              <h3 className="font-bold">Import from GitHub</h3>
              <p className="text-xs text-muted">Select a file to optimize</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-muted gap-3">
              <Loader2 className="animate-spin" size={32} />
              <span>Fetching from GitHub...</span>
            </div>
          )}

          {!loading && !selectedRepo && (
            <div className="space-y-2">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                <input 
                  type="text" placeholder="Search repositories..." 
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              {repos.filter(r => r.full_name.toLowerCase().includes(search.toLowerCase())).map(repo => (
                <button 
                  key={repo.id}
                  onClick={() => handleRepoClick(repo.full_name)}
                  className="w-full p-4 flex items-center justify-between rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/10 transition group text-left"
                >
                  <div className="flex items-center gap-3">
                    <Folder className="text-indigo-400" size={20} />
                    <div>
                      <div className="font-medium text-sm">{repo.name}</div>
                      <div className="text-xs text-muted">{repo.full_name}</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted group-hover:text-white transition" />
                </button>
              ))}
            </div>
          )}

          {!loading && selectedRepo && (
            <div className="space-y-1">
              <button 
                onClick={goBack}
                className="flex items-center gap-2 text-xs text-indigo-400 mb-4 hover:underline"
              >
                ← Back to {currentPath.length > 0 ? currentPath[currentPath.length - 1] : 'Repositories'}
              </button>
              
              <div className="text-xs text-muted mb-2 px-2">Path: /{currentPath.join('/')}</div>

              {contents.map(item => (
                <button 
                  key={item.sha}
                  onClick={() => handleContentClick(item)}
                  className="w-full p-3 flex items-center justify-between rounded-xl hover:bg-white/5 transition group text-left"
                >
                  <div className="flex items-center gap-3">
                    {item.type === 'dir' ? <Folder className="text-amber-400" size={18} /> : <FileCode className="text-indigo-400" size={18} />}
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <ChevronRight size={14} className="text-muted opacity-0 group-hover:opacity-100 transition" />
                </button>
              ))}

              {contents.length === 0 && (
                <div className="text-center py-10 text-muted text-sm italic">This folder is empty</div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default GitHubRepoModal;
