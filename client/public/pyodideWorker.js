// pyodideWorker.js
importScripts('https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js');

let pyodideReadyPromise = null;

async function loadPyodideAndPackages() {
  if (!pyodideReadyPromise) {
    pyodideReadyPromise = loadPyodide();
  }
  return await pyodideReadyPromise;
}

self.onmessage = async (event) => {
  const { id, pythonCode } = event.data;
  
  if (!pythonCode) {
    self.postMessage({ id, ok: false, error: 'No code provided.' });
    return;
  }

  try {
    const pyodide = await loadPyodideAndPackages();
    
    let stdoutText = '';
    let stderrText = '';
    
    pyodide.setStdout({ batched: (msg) => { stdoutText += msg + '\\n'; } });
    pyodide.setStderr({ batched: (msg) => { stderrText += msg + '\\n'; } });

    const start = performance.now();
    await pyodide.runPythonAsync(pythonCode);
    const end = performance.now();
    
    self.postMessage({
      id,
      ok: true,
      stdout: stdoutText + (stderrText ? '\\n' + stderrText : ''),
      error: null,
      exec_time_ms: parseInt(end - start),
      memory_mb: 0
    });
  } catch (err) {
    self.postMessage({
      id,
      ok: false,
      stdout: '',
      error: err.toString(),
      exec_time_ms: 0,
      memory_mb: 0
    });
  }
};

