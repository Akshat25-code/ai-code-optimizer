"""Code tracer â€” runs Python code under sys.settrace for step-by-step visualization."""
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


_TRACE_WRAPPER = r"""
import io, json, os, sys, time

MAX_STEPS = 10000
MAX_VAR_LEN = 50

ALLOWED_ROOT_MODULES = {"math","itertools","functools","collections","re","statistics"}

def _safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    root = (name or "").split(".", 1)[0]
    if root in ALLOWED_ROOT_MODULES:
        return __import__(name, globals, locals, fromlist, level)
    raise ImportError(f"Import blocked in sandbox: {name}")

def _build_safe_builtins():
    return {
        "__import__": _safe_import, "print": print, "range": range, "len": len,
        "sum": sum, "min": min, "max": max, "abs": abs, "round": round,
        "sorted": sorted, "reversed": reversed, "enumerate": enumerate, "zip": zip,
        "map": map, "filter": filter, "list": list, "dict": dict, "set": set,
        "tuple": tuple, "int": int, "float": float, "str": str, "bool": bool,
        "Exception": Exception, "BaseException": BaseException, "ValueError": ValueError,
        "TypeError": TypeError, "RuntimeError": RuntimeError, "KeyError": KeyError,
        "IndexError": IndexError, "ZeroDivisionError": ZeroDivisionError,
        "AssertionError": AssertionError,
    }

def _truncate_value(val, depth=0):
    if depth > 3:
        return "<Max Depth>"
    if isinstance(val, (int, float, bool, type(None))):
        return val
    elif isinstance(val, str):
        return val[:MAX_VAR_LEN] + "..." if len(val) > MAX_VAR_LEN else val
    elif isinstance(val, list):
        items = [_truncate_value(x, depth+1) for x in val[:MAX_VAR_LEN]]
        return items + ["<truncated>"] if len(val) > MAX_VAR_LEN else items
    elif isinstance(val, tuple):
        items = [_truncate_value(x, depth+1) for x in val[:MAX_VAR_LEN]]
        return tuple(items + ["<truncated>"]) if len(val) > MAX_VAR_LEN else tuple(items)
    elif isinstance(val, dict):
        res = {}
        for i, (k, v) in enumerate(val.items()):
            if i >= MAX_VAR_LEN:
                res["<truncated>"] = "<truncated>"; break
            res[str(k)] = _truncate_value(v, depth+1)
        return res
    elif isinstance(val, set):
        res = []
        for i, v in enumerate(val):
            if i >= MAX_VAR_LEN:
                res.append("<truncated>"); break
            res.append(_truncate_value(v, depth+1))
        return res
    else:
        rep = repr(val)
        return rep[:MAX_VAR_LEN] + "..." if len(rep) > MAX_VAR_LEN else rep

class Tracer:
    def __init__(self):
        self.steps = []
        self.truncated = False
    def trace_calls(self, frame, event, arg):
        if event != 'line':
            return self.trace_calls
        if frame.f_code.co_filename != "<user_code>":
            return self.trace_calls
        if len(self.steps) >= MAX_STEPS:
            self.truncated = True
            sys.settrace(None)
            raise RuntimeError("Trace limit exceeded")
        locs = frame.f_locals
        clean = {}
        for k, v in locs.items():
            if k.startswith("__") or k in ('__name__','__builtins__'):
                continue
            if type(v).__name__ in ('function','module','type','builtin_function_or_method'):
                continue
            try:
                clean[k] = _truncate_value(v)
            except Exception:
                clean[k] = "<Error>"
        self.steps.append({"line": frame.f_lineno, "variables": clean, "operation": "", "detail": ""})
        return self.trace_calls

def main():
    user_code_path = sys.argv[1]
    try:
        with open(user_code_path, "r", encoding="utf-8") as f:
            user_code = f.read()
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e), "steps": []})); return
    tracer = Tracer()
    try:
        compiled = compile(user_code, "<user_code>", "exec")
    except SyntaxError as e:
        print(json.dumps({"ok": False, "error": f"SyntaxError: {e}", "steps": []})); return
    safe_mode = os.getenv("RUNNER_SAFE_MODE", "1") == "1"
    globals_dict = {"__name__": "__main__"}
    if safe_mode:
        globals_dict["__builtins__"] = _build_safe_builtins()
    sys.settrace(tracer.trace_calls)
    ok, error_msg = True, ""
    start = time.perf_counter()
    out_buf = io.StringIO()
    old_out = sys.stdout; sys.stdout = out_buf
    try:
        exec(compiled, globals_dict, {})
    except SystemExit as e:
        ok = False; error_msg = f"SystemExit: {e}"
    except Exception as e:
        ok = False; error_msg = f"{type(e).__name__}: {e}"
    finally:
        sys.settrace(None); sys.stdout = old_out; end = time.perf_counter()
    print(json.dumps({"ok": ok, "error": error_msg, "exec_time_ms": int((end-start)*1000),
                       "steps": tracer.steps, "truncated": tracer.truncated,
                       "step_count": len(tracer.steps)}, ensure_ascii=False))

if __name__ == "__main__":
    main()
"""


def _find_python_exe() -> str:
    python_exe = os.getenv("PYTHON_EXEC")
    if not python_exe:
        here = os.path.dirname(__file__)
        for c in [
            os.path.join(here, "env", "bin", "python"),
            os.path.join(here, "env", "bin", "python3"),
            os.path.join(here, "env", "Scripts", "python.exe"),
        ]:
            if os.path.exists(c):
                return c
    return python_exe or "python"


def trace_python(code: str, timeout_ms: int = 8000) -> dict:
    """Run Python code under sys.settrace to capture line-by-line execution."""
    with tempfile.TemporaryDirectory(prefix="aico_trace_") as td:
        wp = os.path.join(td, "trace_wrapper.py")
        up = os.path.join(td, "user_code.py")
        with open(wp, "w", encoding="utf-8") as f:
            f.write(_TRACE_WRAPPER)
        with open(up, "w", encoding="utf-8") as f:
            f.write(code or "")
        try:
            if should_use_docker():
                cp = run_in_docker(get_image("python"),
                    ["python", "trace_wrapper.py", "user_code.py"],
                    td, max(0.1, timeout_ms / 1000))
            else:
                cp = _safe_subprocess_run(
                    [_find_python_exe(), wp, up],
                    timeout_s=max(0.1, timeout_ms / 1000))
        except subprocess.TimeoutExpired:
            return {"ok": False, "error": "Timeout", "steps": [], "truncated": True, "step_count": 0}
        try:
            return json.loads((cp.stdout or "").strip() or "{}")
        except Exception:
            return {"ok": False, "error": "Parse error", "steps": [], "truncated": False, "step_count": 0}
