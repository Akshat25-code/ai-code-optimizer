import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/services/apiClient';

const ExportReportPanel = ({ reportData, disabled }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState('html');
  const [error, setError] = useState('');

  const handleExport = async () => {
    if (disabled || !reportData) return;
    setIsExporting(true);
    setError('');
    try {
      // The API endpoint /intelligence/report
      const response = await apiClient.exportReport(reportData, format);

      let blob;
      let filename = `code-intelligence-report.${format}`;

      if (format === 'json') {
        blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
      } else if (format === 'html') {
        // apiClient returns text for HTML
        blob = new Blob([response], { type: 'text/html' });
      }

      // Create a temporary link to trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      setError(err.message || 'Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mt-4 p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--card-border)] shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-[var(--fg-color)]">Export Session Report</h4>
        <div className="flex gap-1 bg-[var(--card-bg)] p-1 rounded-md border border-[var(--card-border)]">
          <button
            onClick={() => setFormat('html')}
            className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${format === 'html' ? 'bg-cyan-500/20 text-cyan-400' : 'text-muted hover:text-[var(--fg-color)]'}`}
          >
            HTML
          </button>
          <button
            onClick={() => setFormat('json')}
            className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${format === 'json' ? 'bg-cyan-500/20 text-cyan-400' : 'text-muted hover:text-[var(--fg-color)]'}`}
          >
            JSON
          </button>
        </div>
      </div>

      <p className="text-xs text-muted mb-4">
        Download a complete record of this review session, including static analysis, tests, diffs, and verification metrics.
      </p>

      <button
        onClick={handleExport}
        disabled={disabled || isExporting}
        className="w-full btn-primary flex items-center justify-center gap-2 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? (
          <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
        Download Report
      </button>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExportReportPanel;

