// Pyodide In-Browser Execution Web Worker
// Loads Pyodide dynamically with fallback handling

let pyodide = null;
let pyodideLoadingPromise = null;

async function loadPyodideEngine() {
  if (pyodide) return pyodide;
  if (pyodideLoadingPromise) return pyodideLoadingPromise;

  pyodideLoadingPromise = (async () => {
    try {
      importScripts('https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js');
      pyodide = await self.loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
      });
      return pyodide;
    } catch (err) {
      console.warn('[Pyodide Worker] Could not load Pyodide CDN (offline mode):', err.message);
      return null;
    }
  })();

  return pyodideLoadingPromise;
}

self.onmessage = async (e) => {
  const { id, pythonCode } = e.data;
  if (!id || !pythonCode) return;

  const startTime = performance.now();
  try {
    const py = await loadPyodideEngine();
    if (!py) {
      // Fallback response if Pyodide CDN is unreachable
      self.postMessage({
        id,
        ok: false,
        error: 'Pyodide CDN is unavailable offline. Use server-side execution instead.',
        success: false,
        stdout: '',
        stderr: 'Pyodide CDN is unavailable offline. Use server-side execution instead.',
        exec_time_ms: Math.round(performance.now() - startTime),
        executionTimeMs: Math.round(performance.now() - startTime),
      });
      return;
    }

    // Capture stdout
    let stdoutBuffer = [];
    py.setStdout({
      batched: (text) => stdoutBuffer.push(text),
    });

    let stderrBuffer = [];
    py.setStderr({
      batched: (text) => stderrBuffer.push(text),
    });

    const result = await py.runPythonAsync(pythonCode);
    const endTime = performance.now();

    self.postMessage({
      id,
      ok: true,
      success: true,
      result: result !== undefined ? String(result) : null,
      stdout: stdoutBuffer.join('\n'),
      stderr: stderrBuffer.join('\n'),
      exec_time_ms: Math.round(endTime - startTime),
      executionTimeMs: Math.round(endTime - startTime),
    });
  } catch (error) {
    const endTime = performance.now();
    self.postMessage({
      id,
      ok: false,
      error: error.message || 'Execution error',
      success: false,
      stdout: '',
      stderr: error.message || 'Execution error',
      exec_time_ms: Math.round(endTime - startTime),
      executionTimeMs: Math.round(endTime - startTime),
    });
  }
};
