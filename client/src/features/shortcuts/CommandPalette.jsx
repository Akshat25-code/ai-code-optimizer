import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Terminal, Settings, LogOut, Code, Play, FolderArchive, Moon, Sun, Monitor } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function CommandPalette({ isOpen, onClose, onRun, onSave }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  // Define commands
  const allCommands = [
    { id: 'run', title: 'Run Code', icon: <Play size={16} />, section: 'Editor', action: () => onRun && onRun(), shortcut: 'Cmd+Enter' },
    { id: 'save', title: 'Save Session', icon: <FolderArchive size={16} />, section: 'Editor', action: () => onSave && onSave(), shortcut: 'Cmd+S' },

    { id: 'nav_optimize', title: 'Go to Code Optimizer', icon: <Code size={16} />, section: 'Navigation', action: () => navigate('/optimize') },
    { id: 'nav_workspace', title: 'Go to Workspace', icon: <Terminal size={16} />, section: 'Navigation', action: () => navigate('/workspace') },
    { id: 'nav_profile', title: 'Go to Profile', icon: <Settings size={16} />, section: 'Navigation', action: () => user ? navigate('/profile') : navigate('/auth') },

    { id: 'theme_dark', title: 'Switch to Dark Theme', icon: <Moon size={16} />, section: 'Preferences', action: () => setTheme('dark') },
    { id: 'theme_light', title: 'Switch to Light Theme', icon: <Sun size={16} />, section: 'Preferences', action: () => setTheme('light') },
    { id: 'theme_sys', title: 'Switch to System Theme', icon: <Monitor size={16} />, section: 'Preferences', action: () => setTheme('system') },

    ...(user ? [{ id: 'logout', title: 'Log Out', icon: <LogOut size={16} />, section: 'Account', action: () => logout() }] : []),
  ];

  // Filter commands
  const filteredCommands = query
    ? allCommands.filter(c => c.title.toLowerCase().includes(query.toLowerCase()) || c.section.toLowerCase().includes(query.toLowerCase()))
    : allCommands;

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation inside the palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < filteredCommands.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-color)', borderColor: 'var(--card-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b" style={{ borderColor: 'var(--card-border)' }}>
          <Search size={20} className="text-slate-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-lg"
            style={{ color: 'var(--fg-color)' }}
            placeholder="Type a command or search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <div className="text-xs text-slate-500 font-mono flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800">ESC</kbd> to close
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-10 text-center text-slate-500">No commands found.</div>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <div
                key={cmd.id}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => { cmd.action(); onClose(); }}
                className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors ${
                  idx === selectedIndex ? 'bg-teal-500/20 text-teal-400' : 'text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${idx === selectedIndex ? 'bg-teal-500/20' : 'bg-slate-800'}`}>
                    {cmd.icon}
                  </div>
                  <div>
                    <div className="font-medium">{cmd.title}</div>
                    <div className="text-[10px] uppercase tracking-wider opacity-60 font-semibold">{cmd.section}</div>
                  </div>
                </div>

                {cmd.shortcut && (
                  <div className="text-xs font-mono opacity-50 flex items-center gap-1">
                    {cmd.shortcut.split('+').map(k => (
                      <kbd key={k} className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-800">{k}</kbd>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

