import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import CodeEditor from '@/components/editor/CodeEditor';
import DiffViewer from '@/components/reports/DiffViewer';
import ProofPanel from '@/components/reports/ProofPanel';
import ComplexityDashboard from '@/components/reports/ComplexityDashboard';
import GitHubRepoModal from '@/features/repository/GitHubRepoModal';
import useOptimizer from '@/features/optimization/useOptimizer';
import { apiClient } from '@/services/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import ProjectSidebar from './ProjectSidebar';
import TabBar from './TabBar';
import ProjectDashboard from './ProjectDashboard';

const NAV = [
  { id: 'workspace', label: 'Single File Workspace' },
  { id: 'repo', label: 'Import Project' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'optimization', label: 'Optimization' },
  { id: 'tests', label: 'Tests' },
  { id: 'reports', label: 'Reports' },
  { id: 'sessions', label: 'Sessions' },
];

function RepoScanDetails({ repoScan }) {
  if (!repoScan) return null;

  return (
    <div className="mt-4 space-y-4 text-xs">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded border p-2" style={{ borderColor: 'var(--border-color)' }}>
          <div className="opacity-60">Health</div>
          <div className="text-xl font-bold" style={{ color: repoScan.health_score >= 85 ? '#10b981' : repoScan.health_score >= 60 ? '#f59e0b' : '#ef4444' }}>
            {repoScan.health_score}/100
          </div>
        </div>
        <div className="rounded border p-2" style={{ borderColor: 'var(--border-color)' }}>
          <div className="opacity-60">Scanned</div>
          <div className="text-sm font-semibold">{repoScan.summary?.file_count || 0} files</div>
          <div className="opacity-70">{repoScan.summary?.total_lines || 0} lines</div>
        </div>
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const opt = useOptimizer();
  const [activeNav, setActiveNav] = useState('repo');
  const [providerStatus, setProviderStatus] = useState(null);
  const [verification, setVerification] = useState(null);
  const [secretsScan, setSecretsScan] = useState(null);
  const [repoScan, setRepoScan] = useState(null);
  const [testCode, setTestCode] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [consoleLog, setConsoleLog] = useState([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [projectName, setProjectName] = useState('Untitled Project');

  // Multi-file project state
  const [currentProject, setCurrentProject] = useState(null);
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [projectAnalysis, setProjectAnalysis] = useState(null);
  const [isAnalyzingProject, setIsAnalyzingProject] = useState(false);

  const log = useCallback((msg) => {
    setConsoleLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 49)]);
  }, []);

  useEffect(() => {
    apiClient.providerStatus().then(setProviderStatus).catch(() => {});
  }, []);

  useEffect(() => {
    if (opt.code?.trim()) {
      apiClient.scanSecrets(opt.code).then(setSecretsScan).catch(() => {});
    }
  }, [opt.code]);

  // Project data loading
  const loadProjectAnalysis = async (projectId) => {
    if (!projectId) return;
    setIsAnalyzingProject(true);
    try {
      const data = await apiClient.getProjectAnalysis(projectId);
      setProjectAnalysis(data);
      log(`Project analysis complete: ${data.total_files} files`);
    } catch (err) {
      log(`Failed to analyze project: ${err.message}`);
    } finally {
      setIsAnalyzingProject(false);
    }
  };

  const handleVerify = async () => {
    if (!opt.code.trim()) return;
    setIsVerifying(true);
    log('Starting verified optimization...');
    try {
      const lang = opt.resolvedEditorLanguage || opt.language || 'Python';
      const data = await apiClient.verifyOptimization({
        code: opt.code,
        optimized_code: opt.outCode || undefined,
        language: lang,
        provider: opt.aiProvider === 'auto' ? null : opt.aiProvider,
        user_instructions: opt.userInstructions,
        optimization_focus: Object.keys(opt.optimizationFocus).filter((k) => opt.optimizationFocus[k]),
        skip_ai: !!(opt.outCode && opt.outCode.trim()),
      });
      setVerification(data);
      if (data.optimized_code && !opt.outCode) {
        opt.setOutCode(data.optimized_code);
        opt.setOptimizedCode(data.optimized_code);
      }
      opt.setRunCompare({
        output_match: data.proof_panel?.output_match,
        original: data.runtime?.original,
        optimized: data.runtime?.optimized,
        speed_improvement_pct: data.proof_panel?.speed_gain_pct,
      });
      log(`Verification: ${data.status}`);

      // If we're in a project and optimized a file, save it back
      if (currentProject && activeTabId && data.optimized_code) {
        log(`Updating file ${activeTabId} in project...`);
        await apiClient.updateProjectFile(currentProject.id, activeTabId, data.optimized_code);

        // Update local open tab content too
        const newTabs = [...openTabs];
        const tab = newTabs.find(t => t.id === activeTabId);
        if (tab) {
          tab.content = data.optimized_code;
          setOpenTabs(newTabs);
          opt.setCode(data.optimized_code);
        }

        // Re-run analysis in background
        loadProjectAnalysis(currentProject.id);
      }
    } catch (e) {
      log(`Verify failed: ${e.message}`);
      opt.setError(e.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const createWorkspaceProject = async (files, name) => {
    log(`Creating project: ${name} (${files.length} files)...`);
    try {
      const proj = await apiClient.createProject({
        name,
        files: files.map(f => ({ path: f.path, content: f.content }))
      });

      // Fetch full tree
      const treeData = await apiClient.getProjectTree(proj.id);

      setCurrentProject({
        ...proj,
        tree: treeData.tree
      });

      setProjectName(name);
      setActiveNav('project_dashboard');

      // Load initial analysis
      loadProjectAnalysis(proj.id);

      log(`Project created successfully!`);
    } catch (err) {
      log(`Failed to create project: ${err.message}`);
    }
  };

  const handleRepoUpload = async (e) => {
    const fileList = Array.from(e.target.files || []);
    if (!fileList.length) return;

    // Read files
    const files = await Promise.all(
      fileList.slice(0, 500).map(async (f) => ({
        path: f.webkitRelativePath || f.name,
        content: await f.text(),
      }))
    );

    const name = files[0]?.path?.split('/')[0] || 'Local Folder Project';
    await createWorkspaceProject(files, name);
  };

  const handleZipUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    log(`Reading ZIP file...`);
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);

      const files = [];
      const promises = [];

      contents.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          // Skip binary files and huge files to keep it manageable in browser
          if (relativePath.match(/\.(png|jpg|jpeg|gif|ico|pdf|zip|tar|gz|exe|dll)$/i)) return;

          promises.push(
            zipEntry.async('text').then(content => {
              files.push({
                path: relativePath,
                content: content
              });
            }).catch(err => {
              console.error(`Error reading ${relativePath}`, err);
            })
          );
        }
      });

      await Promise.all(promises);
      log(`Extracted ${files.length} text files from ZIP`);

      const name = file.name.replace('.zip', '');
      await createWorkspaceProject(files, name);

    } catch (err) {
      log(`Failed to parse ZIP: ${err.message}`);
    }
  };

  const handleGhImport = async (files, repoName) => {
    // Adapter for GitHubRepoModal
    const formattedFiles = files.map(f => ({
      path: f.path,
      content: f.content
    }));
    await createWorkspaceProject(formattedFiles, repoName);
  };

  // Tab management
  const openFile = async (path, name, lang) => {
    // Check if already open
    const existing = openTabs.find(t => t.id === path);
    if (existing) {
      setActiveTabId(path);
      opt.setCode(existing.content);
      opt.setLanguage(lang || 'auto');
      setActiveNav('workspace');
      return;
    }

    // Fetch content from backend
    try {
      log(`Loading file: ${path}...`);
      const fileData = await apiClient.getProjectFile(currentProject.id, path);

      const newTab = {
        id: path,
        path: path,
        name: name,
        content: fileData.content,
        language: lang
      };

      setOpenTabs([...openTabs, newTab]);
      setActiveTabId(path);
      opt.setCode(fileData.content);
      opt.setLanguage(lang || 'auto');
      setActiveNav('workspace');
    } catch (err) {
      log(`Failed to load file: ${err.message}`);
    }
  };

  const closeTab = (id) => {
    const newTabs = openTabs.filter(t => t.id !== id);
    setOpenTabs(newTabs);

    if (id === activeTabId) {
      if (newTabs.length > 0) {
        const lastTab = newTabs[newTabs.length - 1];
        setActiveTabId(lastTab.id);
        opt.setCode(lastTab.content);
        opt.setLanguage(lastTab.language || 'auto');
      } else {
        setActiveTabId(null);
        opt.setCode('');
        setActiveNav('project_dashboard'); // Go back to dashboard if no files open
      }
    }
  };

  const selectTab = (id) => {
    const tab = openTabs.find(t => t.id === id);
    if (tab) {
      setActiveTabId(id);
      opt.setCode(tab.content);
      opt.setLanguage(tab.language || 'auto');
      setActiveNav('workspace');
    }
  };

  const handleGenerateTests = async () => {
    log('Generating tests...');
    try {
      const data = await apiClient.generateTests({
        code: opt.code,
        language: opt.resolvedEditorLanguage || 'Python',
        provider: opt.aiProvider === 'auto' ? null : opt.aiProvider,
      });
      setTestCode(data.test_code || '');
      log('Tests generated');
    } catch (e) {
      log(`Test generation failed: ${e.message}`);
    }
  };

  const handleRunTests = async () => {
    log('Running tests...');
    try {
      const data = await apiClient.runTests(opt.code, testCode);
      setTestResults(data);
      log(data.summary);
    } catch (e) {
      log(`Test run failed: ${e.message}`);
    }
  };

  const handleRedact = async () => {
    const data = await apiClient.redactSecrets(opt.code);
    opt.setCode(data.redacted_code);
    log(`Redacted ${data.redaction_count} secret(s)`);

    // Update active tab content
    if (activeTabId) {
      const newTabs = [...openTabs];
      const tab = newTabs.find(t => t.id === activeTabId);
      if (tab) {
        tab.content = data.redacted_code;
        setOpenTabs(newTabs);
      }
    }
  };

  const handleExportReport = async (format) => {
    log(`Exporting ${format} report...`);
    const report = await apiClient.exportReport({
      title: projectName,
      language: opt.resolvedEditorLanguage || 'Python',
      task: opt.task,
      original_code: opt.code,
      optimized_code: opt.outCode || '',
      provider_used: verification?.provider_used || opt.lastTokens?.provider || '',
      inspection: opt.inspection,
      verification,
      test_results: testResults,
    }, format);

    if (format === 'html') {
      const blob = new Blob([report], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } else {
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'code-intelligence-report.json';
      a.click();
    }
    log('Report exported');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-color, #0f172a)', color: 'var(--fg-color, #e2e8f0)' }}>
      {/* Top Bar */}
      <header className="h-12 flex items-center justify-between px-4 border-b shrink-0" style={{ borderColor: 'var(--border-color, #334155)', background: 'var(--panel-bg, #1e293b)' }}>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">{projectName}</span>
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: opt.backendHealthy ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: opt.backendHealthy ? '#10b981' : '#ef4444' }}>
            API {opt.backendHealthy ? 'Online' : 'Offline'}
          </span>
          {providerStatus && (
            <span className="text-xs opacity-60">
              AI: {providerStatus.any_configured ? 'Live' : (providerStatus.fake_ai_mode ? 'Fake (dev)' : 'Not configured')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm">
          {user ? (
            <button type="button" onClick={() => navigate('/profile')} className="opacity-80 hover:opacity-100">{user.name || user.email || 'Profile'}</button>
          ) : (
            <button type="button" onClick={() => navigate('/auth')} className="px-3 py-1 rounded bg-teal-600 text-white text-xs">Sign in</button>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-56 flex flex-col shrink-0 border-r" style={{ borderColor: 'var(--border-color, #334155)' }}>
          {currentProject ? (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-2 border-b flex gap-2 flex-wrap" style={{ borderColor: 'var(--border-color, #334155)' }}>
                <button onClick={() => setActiveNav('project_dashboard')} className={`text-xs px-2 py-1 flex-1 rounded ${activeNav === 'project_dashboard' ? 'bg-teal-600/20 text-teal-300' : 'hover:bg-white/5'}`}>
                  Dashboard
                </button>
                <button onClick={() => { setCurrentProject(null); setActiveNav('repo'); }} className="text-xs px-2 py-1 rounded border hover:bg-white/5 opacity-70">
                  Close
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <ProjectSidebar
                  tree={currentProject.tree}
                  projectName={currentProject.name}
                  activePath={activeTabId}
                  onFileSelect={openFile}
                />
              </div>
            </div>
          ) : (
            <div className="p-2 space-y-1 text-sm overflow-y-auto h-full">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveNav(item.id)}
                  className={`w-full text-left px-3 py-2 rounded transition ${activeNav === item.id ? 'bg-teal-600/20 text-teal-300' : 'opacity-70 hover:opacity-100'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Main Workspace Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

          {activeNav === 'project_dashboard' && currentProject ? (
            <ProjectDashboard analysis={projectAnalysis} isLoading={isAnalyzingProject} />
          ) : (
            <div className="flex-1 flex flex-col p-3 gap-3 min-h-0">
              {/* Controls Toolbar */}
              <div className="flex flex-wrap gap-2 shrink-0">
                <select value={opt.language} onChange={(e) => opt.setLanguage(e.target.value)} className="text-xs px-2 py-1 rounded border bg-transparent" style={{ borderColor: 'var(--border-color)' }}>
                  <option value="auto">Auto</option>
                  {(opt.supportedLanguages || []).map((l) => <option key={l.key} value={l.key}>{l.name}</option>)}
                </select>
                <select value={opt.task} onChange={(e) => opt.setTask(e.target.value)} className="text-xs px-2 py-1 rounded border bg-transparent" style={{ borderColor: 'var(--border-color)' }}>
                  <option value="optimization">Optimization</option>
                  <option value="bug_detection">Bug Detection</option>
                  <option value="analysis">Analysis</option>
                  <option value="documentation">Documentation</option>
                </select>
                <button type="button" onClick={opt.handleOptimizeCode} disabled={opt.isOptimizing || !opt.code} className="px-3 py-1 text-xs rounded bg-teal-600 text-white disabled:opacity-50">
                  {opt.isOptimizing ? 'Running...' : 'Analyze'}
                </button>
                <button type="button" onClick={handleVerify} disabled={isVerifying || !opt.code} className="px-3 py-1 text-xs rounded border border-teal-500 text-teal-300 disabled:opacity-50">
                  {isVerifying ? 'Verifying...' : 'Verify Optimization'}
                </button>
                <button type="button" onClick={() => opt.setGhModalOpen(true)} className="px-3 py-1 text-xs rounded border opacity-80">GitHub Import</button>
                {secretsScan?.has_secrets && (
                  <button type="button" onClick={handleRedact} className="px-3 py-1 text-xs rounded bg-red-600/80 text-white">Redact Secrets</button>
                )}
                <button type="button" onClick={() => handleExportReport('json')} className="px-3 py-1 text-xs rounded border opacity-80">Export Report</button>
              </div>

              <div className="grid lg:grid-cols-3 gap-3 flex-1 min-h-0">
                {/* Editor with Tabs */}
                <div className="flex flex-col min-h-0 rounded-lg border overflow-hidden bg-black/20" style={{ borderColor: 'var(--border-color)' }}>
                  {currentProject && (
                    <TabBar
                      tabs={openTabs}
                      activeTabId={activeTabId}
                      onTabSelect={selectTab}
                      onTabClose={closeTab}
                    />
                  )}
                  <div className="flex-1 min-h-[200px] relative">
                    {(!currentProject || activeTabId) ? (
                      <CodeEditor
                        value={opt.code}
                        onChange={(newCode) => {
                          opt.setCode(newCode);
                          // Sync with tab if one is open
                          if (activeTabId) {
                            setOpenTabs(tabs => tabs.map(t => t.id === activeTabId ? { ...t, content: newCode } : t));
                          }
                        }}
                        language={opt.resolvedEditorLanguage}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center opacity-50 text-sm">
                        Select a file from the sidebar to view it.
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Panel: Findings + Proof */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0 overflow-auto">
                  <div className="flex flex-col gap-3 min-h-0 overflow-auto pr-1">
                    {activeNav === 'repo' && !currentProject && (
                      <div className="rounded-lg border p-4 text-sm flex flex-col gap-4" style={{ borderColor: 'var(--border-color)' }}>
                        <h2 className="text-lg font-bold">Import a Project</h2>
                        <p className="opacity-70 text-xs">Analyze multiple files, view dependencies, and get project-wide metrics.</p>

                        <div className="space-y-4">
                          <div className="p-3 border rounded bg-black/20" style={{ borderColor: 'var(--border-color)' }}>
                            <label className="block mb-2 font-semibold">1. Upload Folder</label>
                            <input type="file" webkitdirectory="" directory="" multiple onChange={handleRepoUpload} className="text-xs" />
                          </div>

                          <div className="p-3 border rounded bg-black/20" style={{ borderColor: 'var(--border-color)' }}>
                            <label className="block mb-2 font-semibold">2. Upload ZIP file</label>
                            <input type="file" accept=".zip" onChange={handleZipUpload} className="text-xs" />
                          </div>

                          <div className="p-3 border rounded bg-black/20" style={{ borderColor: 'var(--border-color)' }}>
                            <label className="block mb-2 font-semibold">3. Import from GitHub</label>
                            <button onClick={() => opt.setGhModalOpen(true)} className="px-3 py-1.5 text-xs rounded bg-white/10 hover:bg-white/20 w-full transition">
                              Connect to GitHub Repository
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeNav === 'tests' && (
                      <div className="space-y-2">
                        <button type="button" onClick={handleGenerateTests} className="px-3 py-1 text-xs rounded bg-teal-600 text-white">Generate Tests</button>
                        <textarea value={testCode} onChange={(e) => setTestCode(e.target.value)} className="w-full h-32 text-xs font-mono p-2 rounded border bg-transparent" style={{ borderColor: 'var(--border-color)' }} placeholder="Generated tests appear here..." />
                        <button type="button" onClick={handleRunTests} className="px-3 py-1 text-xs rounded border">Run Tests</button>
                        {testResults && <pre className="text-xs p-2 rounded bg-black/30 overflow-auto max-h-32">{testResults.output}</pre>}
                      </div>
                    )}

                    <DiffViewer original={opt.code} modified={opt.outCode || ''} title="Code Diff" />

                    {opt.outExplanation && (
                      <div className="rounded-lg border p-3 text-xs max-h-40 overflow-auto opacity-90" style={{ borderColor: 'var(--border-color)' }}>
                        {opt.outExplanation.slice(0, 2000)}
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border p-3 overflow-auto" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-3">Proof Panel</div>
                    <ProofPanel
                      inspection={opt.inspection}
                      verification={verification}
                      runCompare={opt.runCompare}
                      testResults={testResults}
                      secretsScan={secretsScan}
                      providerStatus={providerStatus}
                    />
                    {opt.complexityReport && (
                      <div className="mt-3">
                        <ComplexityDashboard
                          data={opt.complexityReport}
                          comparison={opt.complexityReport?.comparison}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Console */}
          <div className="h-28 shrink-0 rounded-t-lg border-t border-l border-r overflow-hidden absolute bottom-0 right-3 w-[calc(100%-1.5rem)] md:w-96 z-40 bg-black/90 backdrop-blur" style={{ borderColor: 'var(--border-color)' }}>
            <div className="px-2 py-1 text-xs font-medium border-b opacity-60 flex justify-between" style={{ borderColor: 'var(--border-color)' }}>
              <span>Console</span>
              <button onClick={() => setConsoleLog([])} className="hover:text-white">Clear</button>
            </div>
            <pre className="p-2 text-[11px] font-mono h-[calc(100%-1.5rem)] overflow-auto text-teal-300">{consoleLog.join('\n') || 'Ready.'}</pre>
          </div>
        </main>
      </div>

      {opt.ghModalOpen && (
        <GitHubRepoModal
          isOpen={opt.ghModalOpen}
          onClose={() => opt.setGhModalOpen(false)}
          onImport={async (content, filename) => {
            // Check if it's returning a single file or a repo (need to update GitHubRepoModal to support full repo import eventually)
            if (Array.isArray(content)) {
              await handleGhImport(content, filename);
              opt.setGhModalOpen(false);
            } else {
              // Single file mode
              opt.setCode(content);
              setProjectName(filename);
              opt.setGhModalOpen(false);
              log(`Imported ${filename}`);
            }
          }}
        />
      )}

      {opt.toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded text-sm text-white ${opt.toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {opt.toast.message}
        </div>
      )}
    </div>
  );
}

