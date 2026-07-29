"""Performance profiler â€” wraps user code with instrumentation to capture metrics."""
from __future__ import annotations

import json
import os
import subprocess
import tempfile
import time

from services.execution.docker_runner import (
    should_use_docker,
    run_in_docker,
    get_image,
    _safe_subprocess_run,
)


_PYTHON_PROFILE_WRAPPER = r"""
import cProfile
import io
import json
import os
import pstats
import sys
import tracemalloc


def main():
    user_code_path = sys.argv[1]
    try:
        with open(user_code_path, "r", encoding="utf-8") as f:
            user_code = f.read()
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))
        return

    # Profile execution
    tracemalloc.start()
    profiler = cProfile.Profile()

    ok = True
    error_msg = ""
    try:
        compiled = compile(user_code, "<user_code>", "exec")
        profiler.enable()
        exec(compiled, {"__name__": "__main__"}, {})
        profiler.disable()
    except Exception as e:
        profiler.disable()
        ok = False
        error_msg = f"{type(e).__name__}: {e}"

    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    # Extract hotspots from profiler stats
    stream = io.StringIO()
    stats = pstats.Stats(profiler, stream=stream)
    stats.sort_stats("cumulative")

    hotspots = []
    for (filename, line, name), (cc, nc, tt, ct, callers) in sorted(
        stats.stats.items(), key=lambda x: x[1][3], reverse=True
    )[:10]:
        if filename == "<user_code>":
            hotspots.append({
                "func": name,
                "line": line,
                "calls": nc,
                "total_time": round(tt, 6),
                "cum_time": round(ct, 6),
            })

    print(json.dumps({
        "ok": ok,
        "error": error_msg,
        "peak_kb": int(peak / 1024),
        "current_kb": int(current / 1024),
        "hotspots": hotspots,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
"""


_JS_PROFILE_WRAPPER = r"""
const fs = require('fs');
const { performance } = require('perf_hooks');

const userCodePath = process.argv[2];
const userCode = fs.readFileSync(userCodePath, 'utf-8');

const memBefore = process.memoryUsage();
const startTime = performance.now();

try {
    const fn = new Function(userCode);
    fn();
} catch (e) {
    console.log(JSON.stringify({
        ok: false,
        error: e.message,
        peak_kb: 0,
        hotspots: [],
    }));
    process.exit(0);
}

const endTime = performance.now();
const memAfter = process.memoryUsage();

console.log(JSON.stringify({
    ok: true,
    error: '',
    peak_kb: Math.round((memAfter.heapUsed - memBefore.heapUsed) / 1024),
    exec_time_ms: Math.round(endTime - startTime),
    memory: {
        heap_used_kb: Math.round(memAfter.heapUsed / 1024),
        heap_total_kb: Math.round(memAfter.heapTotal / 1024),
        rss_kb: Math.round(memAfter.rss / 1024),
    },
    hotspots: [],
}));
"""


def _find_python_exe() -> str:
    exe = os.getenv("PYTHON_EXEC")
    if not exe:
        here = os.path.dirname(__file__)
        for c in [
            os.path.join(here, "env", "bin", "python"),
            os.path.join(here, "env", "bin", "python3"),
            os.path.join(here, "env", "Scripts", "python.exe"),
        ]:
            if os.path.exists(c):
                return c
    return exe or "python"


def profile_python(code: str, timeout_ms: int = 10000) -> dict:
    """Profile Python code: tracemalloc + cProfile hotspots."""
    with tempfile.TemporaryDirectory(prefix="aico_prof_") as td:
        wp = os.path.join(td, "profile_wrapper.py")
        up = os.path.join(td, "user_code.py")
        with open(wp, "w", encoding="utf-8") as f:
            f.write(_PYTHON_PROFILE_WRAPPER)
        with open(up, "w", encoding="utf-8") as f:
            f.write(code or "")
        try:
            if should_use_docker():
                cp = run_in_docker(
                    get_image("python"),
                    ["python", "profile_wrapper.py", "user_code.py"],
                    td, max(0.1, timeout_ms / 1000),
                )
            else:
                cp = _safe_subprocess_run(
                    [_find_python_exe(), wp, up],
                    timeout_s=max(0.1, timeout_ms / 1000),
                )
        except subprocess.TimeoutExpired:
            return {"ok": False, "error": "Timeout", "peak_kb": 0, "hotspots": []}
        try:
            return json.loads((cp.stdout or "").strip() or "{}")
        except Exception:
            return {"ok": False, "error": "Parse error", "peak_kb": 0, "hotspots": []}


def profile_javascript(code: str, timeout_ms: int = 10000) -> dict:
    """Profile JavaScript code: memory usage + timing."""
    with tempfile.TemporaryDirectory(prefix="aico_jsprof_") as td:
        wp = os.path.join(td, "profile_wrapper.js")
        up = os.path.join(td, "user_code.js")
        with open(wp, "w", encoding="utf-8") as f:
            f.write(_JS_PROFILE_WRAPPER)
        with open(up, "w", encoding="utf-8") as f:
            f.write(code or "")
        try:
            if should_use_docker():
                cp = run_in_docker(
                    get_image("javascript"),
                    ["node", "profile_wrapper.js", "user_code.js"],
                    td, max(0.1, timeout_ms / 1000),
                )
            else:
                cp = _safe_subprocess_run(
                    ["node", wp, up],
                    timeout_s=max(0.1, timeout_ms / 1000),
                )
        except subprocess.TimeoutExpired:
            return {"ok": False, "error": "Timeout", "peak_kb": 0, "hotspots": []}
        except FileNotFoundError:
            return {"ok": False, "error": "Node.js not found", "peak_kb": 0, "hotspots": []}
        try:
            return json.loads((cp.stdout or "").strip() or "{}")
        except Exception:
            return {"ok": False, "error": "Parse error", "peak_kb": 0, "hotspots": []}


def profile_code(code: str, language: str, timeout_ms: int = 10000) -> dict:
    """Profile code in the given language."""
    lang = language.lower()
    if lang in ("python", "py"):
        return profile_python(code, timeout_ms)
    elif lang in ("javascript", "js", "node"):
        return profile_javascript(code, timeout_ms)
    else:
        return {"ok": False, "error": f"Profiling not supported for {language}", "peak_kb": 0, "hotspots": []}
