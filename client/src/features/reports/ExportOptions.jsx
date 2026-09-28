import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText, Code2, FileJson, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/services/apiClient';

export default function ExportOptions({ code, language, sessionData = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState(null); // {type:'success'|'error', message} | null
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();

  const flash = (type, message) => {
    setStatus({ type, message });
    setTimeout(() => {
      setStatus(null);
      if (type === 'success') setIsOpen(false);
    }, 2200);
  };

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

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = async () => {
    if (!user) {
      flash('error', 'Sign in to save a server-side report.');
      return;
    }
    setBusy(true);
    try {
      const report = await apiClient.exportReport({
        title: sessionData.title || 'Code Intelligence Report',
        language: language || 'python',
        task: sessionData.task || 'optimization',
        original_code: code || '',
        optimized_code: sessionData.optimized_code || '',
        provider_used: sessionData.provider_used || '',
        inspection: sessionData.inspection || null,
        verification: sessionData.verification || null,
        test_results: sessionData.test_results || null,
      }, 'json');
      downloadBlob(
        new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }),
        `report-${Date.now()}.json`,
      );
      flash('success', 'Report saved');
    } catch (err) {
      flash('error', err.message || 'Report export failed');
    } finally {
      setBusy(false);
    }
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
            {status ? (
              <div className={`p-3 flex flex-col items-center justify-center gap-2 text-sm font-medium ${status.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                {status.type === 'success' && <Check size={24} />}
                {status.message}
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
                  onClick={handleExportJSON}
                  disabled={busy}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg text-left border-t border-slate-700/50 mt-1 pt-2 disabled:opacity-50"
                >
                  <FileJson size={16} className="text-teal-300" />
                  {busy ? 'Saving…' : 'JSON Report'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

