import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE } from '@/config';

const RepoImporter = ({ onImportComplete, className = '' }) => {
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await handleZipUpload(file);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await handleZipUpload(e.target.files[0]);
    }
  };

  const handleZipUpload = async (file) => {
    if (!file.name.endsWith('.zip')) {
      setError("Please upload a valid .zip repository file.");
      return;
    }

    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/intelligence/import-repo/zip`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to parse repository");
      }

      const data = await response.json();
      if (onImportComplete) {
        onImportComplete(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`card fade-in ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
            Repository Importer
          </h3>
          <span className="text-xs px-2 py-1 rounded bg-[var(--surface-1)] border border-[var(--card-border)] text-muted">
            .ZIP Supported
          </span>
        </div>

        <p className="text-sm text-muted mb-6">
          Upload your entire codebase. We will automatically exclude <code>node_modules</code>, compress the context using AST signature extraction, and prepare it for AI analysis.
        </p>

        <div
          className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all duration-300 ${
            dragActive ? 'border-cyan-400 bg-cyan-400/10 scale-[1.02]' : 'border-[var(--card-border)] bg-[var(--surface-1)] hover:border-cyan-400/50 hover:bg-[var(--surface-2)]'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-16 h-16 mb-4 rounded-full bg-[var(--surface-2)] border border-[var(--card-border)] flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(14,165,233,0.15)]">
            {loading ? (
              <svg className="animate-spin w-8 h-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            )}
          </div>

          <p className="text-sm font-medium mb-1">
            {loading ? 'Analyzing AST and compressing context...' : 'Drag & drop your repository .zip'}
          </p>
          <p className="text-xs text-muted mb-4 text-center">
            Max 500 files. Respects standard ignore patterns.
          </p>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="btn-primary"
          >
            Browse Files
          </button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            >
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RepoImporter;

