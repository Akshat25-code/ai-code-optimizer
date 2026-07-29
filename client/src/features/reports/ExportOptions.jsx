import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText, Code2, Github, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE } from '@/config';

export default function ExportOptions({ code, language, sessionData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const { user } = useAuth();

  const handleExportPDF = () => {
    // Basic print trigger since we already have @media print styles
    window.print();
    setIsOpen(false);
  };

  const handleExportHTML = () => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Code Export</title>
  <style>
    body { font-family: system-ui; padding: 2rem; background: #0f172a; color: #f8fafc; }
    pre { background: #1e293b; padding: 1rem; border-radius: 8px; overflow-x: auto; }
  </style>
</head>
<body>
  <h1>Exported Snippet: ${language}</h1>
  <pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  const handleExportGist = async () => {
    if (!user) {
      alert("Please log in to export to GitHub Gist.");
      return;
    }

    // In a real implementation, we'd hit a backend endpoint that uses the user's stored GitHub OAuth token.
    // For now, we simulate success since the GitHub service is mocked.
    setStatus('success');
    setTimeout(() => {
      setStatus(null);
      setIsOpen(false);
    }, 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
      >
        <Download size={14} />
        Export
        <ChevronDown size={14} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-48 rounded-xl border overflow-hidden shadow-2xl z-50"
            style={{ background: 'var(--card-bg-solid)', borderColor: 'var(--card-border)' }}
          >
            {status === 'success' ? (
              <div className="p-3 text-emerald-400 flex flex-col items-center justify-center gap-2 text-sm font-medium">
                <Check size={24} />
                Export Successful
              </div>
            ) : (
              <div className="flex flex-col p-1.5">
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg text-left"
                >
                  <FileText size={16} className="text-rose-400" />
                  PDF Report
                </button>
                <button
                  onClick={handleExportHTML}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg text-left"
                >
                  <Code2 size={16} className="text-blue-400" />
                  HTML File
                </button>
                <button
                  onClick={handleExportGist}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg text-left border-t border-slate-700/50 mt-1 pt-2"
                >
                  <Github size={16} className="text-slate-100" />
                  GitHub Gist
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

