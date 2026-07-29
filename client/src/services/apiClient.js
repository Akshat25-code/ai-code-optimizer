/**
 * Unified API client for the verified code intelligence platform.
 */
import { API_BASE } from '@/config';

function authHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function request(path, options = {}) {
  options.credentials = 'include';
  const resp = await fetch(`${API_BASE}${path}`, options);
  const contentType = resp.headers.get('content-type') || '';
  if (!resp.ok) {
    let detail = `HTTP ${resp.status}`;
    try {
      const err = contentType.includes('json') ? await resp.json() : await resp.text();
      detail = err?.detail || err?.message || detail;
    } catch (_e) { /* noop */ }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  if (contentType.includes('text/html')) return resp.text();
  if (contentType.includes('application/json')) return resp.json();
  return resp.text();
}

export const apiClient = {
  health: () => request('/health'),
  providerStatus: () => request('/intelligence/provider-status'),
  supportedLanguages: () => request('/supported-languages'),

  analyzeCode: (body) => request('/analyze-code', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  }),

  inspectCode: (body) => request('/inspect-code', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  }),

  verifyOptimization: (body) => request('/intelligence/verify-optimization', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  }),

  runCodeCompare: (body) => request('/run-code/compare', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  }),



  scanSecrets: (code, filename = 'input.py') => request('/intelligence/scan-secrets', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ code, filename }),
  }),

  redactSecrets: (code) => request('/intelligence/redact-secrets', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ code }),
  }),

  scanRepo: (files) => request('/intelligence/scan-repo', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ files }),
  }),

  generateTests: (body) => request('/intelligence/generate-tests', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  }),

  runTests: (sourceCode, testCode) => request('/intelligence/run-tests', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ source_code: sourceCode, test_code: testCode }),
  }),

  exportReport: (body, format = 'json') => request('/intelligence/report', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ...body, format }),
  }),

  githubApplyPatch: (owner, repo, payload) => request(`/github/repos/${owner}/${repo}/apply-patch`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  }),

  // Project Workspace API
  createProject: (body) => request('/projects/', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  }),

  listProjects: () => request('/projects/'),

  getProject: (id) => request(`/projects/${id}`),

  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),

  getProjectTree: (id) => request(`/projects/${id}/tree`),

  getProjectFile: (id, path) => request(`/projects/${id}/files/${path}`),

  updateProjectFile: (id, path, content) => request(`/projects/${id}/files/${path}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ content }),
  }),

  getProjectAnalysis: (id) => request(`/projects/${id}/analysis`),

  getProjectDependencies: (id) => request(`/projects/${id}/dependencies`),

  getFileImpact: (id, path) => request(`/projects/${id}/impact/${path}`),

  // BYO-API: User API Keys
  listApiKeys: () => request('/api-keys'),

  saveApiKey: (provider, apiKey) => request(`/api-keys/${provider}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ api_key: apiKey }),
  }),

  deleteApiKey: (provider) => request(`/api-keys/${provider}`, { method: 'DELETE' }),

  testApiKey: (provider) => request(`/api-keys/${provider}/test`, {
    method: 'POST',
    headers: authHeaders(),
  }),
};

export default apiClient;

