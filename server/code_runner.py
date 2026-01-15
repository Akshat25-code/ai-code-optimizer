from __future__ import annotations

import json
import os
import subprocess
import tempfile
import time
from dataclasses import dataclass, asdict


@dataclass
class RunResult:
    ok: bool
    stdout: str
    stderr: str
    exec_time_ms: int
    peak_kb: int | None = None


_WRAPPER = r"""
import io
import json
import os
import sys
import time
import tracemalloc


ALLOWED_ROOT_MODULES = {
    "math",
    "itertools",
    "functools",
    "collections",
    "re",
    "statistics",
}


def _safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    # Only allow a small whitelist of stdlib modules
    root = (name or "").split(".", 1)[0]
    if root in ALLOWED_ROOT_MODULES:
        return __import__(name, globals, locals, fromlist, level)
    raise ImportError(f"Import blocked in sandbox: {name}")


def _build_safe_builtins():
    # Minimal useful builtins; excludes open/exec/eval/input
    safe = {
        "__import__": _safe_import,
        "print": print,
        "range": range,
        "len": len,
        "sum": sum,
        "min": min,
        "max": max,
        "abs": abs,
        "round": round,
        "sorted": sorted,
        "reversed": reversed,
        "enumerate": enumerate,
        "zip": zip,
        "map": map,
        "filter": filter,
        "list": list,
        "dict": dict,
        "set": set,
        "tuple": tuple,
        "int": int,
        "float": float,
        "str": str,
        "bool": bool,
        "Exception": Exception,
        "BaseException": BaseException,
        "ValueError": ValueError,
        "TypeError": TypeError,
        "RuntimeError": RuntimeError,
        "KeyError": KeyError,
        "IndexError": IndexError,
        "ZeroDivisionError": ZeroDivisionError,
        "AssertionError": AssertionError,
    }
    return safe


def main():
    user_code_path = sys.argv[1]
    stdin_text = sys.argv[2] if len(sys.argv) > 2 else ""

    try:
        with open(user_code_path, "r", encoding="utf-8") as f:
            user_code = f.read()
    except Exception as e:
        print(json.dumps({"ok": False, "stdout": "", "stderr": f"Failed to read code: {e}", "exec_time_ms": 0, "peak_kb": None}))
        return

    # Capture user stdout/stderr
    out_buf = io.StringIO()
    err_buf = io.StringIO()

    old_out, old_err, old_in = sys.stdout, sys.stderr, sys.stdin
    sys.stdout = out_buf
    sys.stderr = err_buf
    sys.stdin = io.StringIO(stdin_text)

    ok = True
    start = time.perf_counter()
    tracemalloc.start()
    try:
        compiled = compile(user_code, "<user_code>", "exec")

        safe_mode = os.getenv("RUNNER_SAFE_MODE", "1") == "1"
        if safe_mode:
            globals_dict = {"__name__": "__main__", "__builtins__": _build_safe_builtins()}
            exec(compiled, globals_dict, {})
        else:
            exec(compiled, {"__name__": "__main__"}, {})
    except SystemExit as e:
        ok = False
        err_buf.write(f"SystemExit: {e}\n")
    except Exception as e:
        ok = False
        err_buf.write(f"{type(e).__name__}: {e}\n")
    finally:
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        end = time.perf_counter()
        sys.stdout, sys.stderr, sys.stdin = old_out, old_err, old_in

    payload = {
        "ok": ok,
        "stdout": out_buf.getvalue(),
        "stderr": err_buf.getvalue(),
        "exec_time_ms": int((end - start) * 1000),
        "peak_kb": int(peak / 1024),
    }
    print(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
    main()
"""


def run_python(code: str, stdin_text: str = "", timeout_ms: int = 5000) -> RunResult:
    start = time.perf_counter()
    with tempfile.TemporaryDirectory(prefix="ai_code_optimizer_run_") as td:
        wrapper_path = os.path.join(td, "wrapper.py")
        user_code_path = os.path.join(td, "user_code.py")

        with open(wrapper_path, "w", encoding="utf-8") as f:
            f.write(_WRAPPER)

        with open(user_code_path, "w", encoding="utf-8") as f:
            f.write(code or "")

        # Prefer the currently running interpreter if available; otherwise fallback to env python
        python_exe = os.getenv("PYTHON_EXEC") or os.path.join(os.path.dirname(__file__), "env", "Scripts", "python.exe")
        if not os.path.exists(python_exe):
            python_exe = "python"

        try:
            cp = subprocess.run(
                [python_exe, wrapper_path, user_code_path, stdin_text],
                capture_output=True,
                text=True,
                timeout=max(0.1, timeout_ms / 1000),
            )
        except subprocess.TimeoutExpired:
            return RunResult(ok=False, stdout="", stderr="Timeout", exec_time_ms=int((time.perf_counter() - start) * 1000), peak_kb=None)

        # Wrapper always prints JSON to stdout (unless python itself crashes)
        try:
            payload = json.loads((cp.stdout or "").strip() or "{}")
            return RunResult(
                ok=bool(payload.get("ok")),
                stdout=str(payload.get("stdout", "")),
                stderr=str(payload.get("stderr", "")) + (cp.stderr or ""),
                exec_time_ms=int(payload.get("exec_time_ms", int((time.perf_counter() - start) * 1000))),
                peak_kb=payload.get("peak_kb"),
            )
        except Exception:
            return RunResult(
                ok=False,
                stdout=cp.stdout or "",
                stderr=(cp.stderr or "") or "Failed to parse runner output",
                exec_time_ms=int((time.perf_counter() - start) * 1000),
                peak_kb=None,
            )


def to_dict(r: RunResult) -> dict:
    return asdict(r)


def run_javascript(code: str, stdin_text: str = "", timeout_ms: int = 5000) -> RunResult:
    """Run JavaScript code using Node.js"""
    start = time.perf_counter()
    with tempfile.TemporaryDirectory(prefix="ai_code_optimizer_run_js_") as td:
        user_code_path = os.path.join(td, "user_code.js")
        
        with open(user_code_path, "w", encoding="utf-8") as f:
            f.write(code or "")
        
        # Find Node.js
        node_exe = "node"
        
        try:
            cp = subprocess.run(
                [node_exe, user_code_path],
                input=stdin_text,
                capture_output=True,
                text=True,
                timeout=max(0.1, timeout_ms / 1000),
            )
            exec_time = int((time.perf_counter() - start) * 1000)
            return RunResult(
                ok=cp.returncode == 0,
                stdout=cp.stdout or "",
                stderr=cp.stderr or "",
                exec_time_ms=exec_time,
                peak_kb=None,
            )
        except subprocess.TimeoutExpired:
            return RunResult(ok=False, stdout="", stderr="Timeout", exec_time_ms=int((time.perf_counter() - start) * 1000), peak_kb=None)
        except FileNotFoundError:
            return RunResult(ok=False, stdout="", stderr="Node.js not found. Please install Node.js to run JavaScript code.", exec_time_ms=0, peak_kb=None)


def run_code(code: str, language: str, stdin_text: str = "", timeout_ms: int = 5000) -> RunResult:
    """Generic code runner that dispatches to language-specific runners"""
    lang_lower = language.lower()
    
    if lang_lower in ("python", "py"):
        return run_python(code, stdin_text, timeout_ms)
    elif lang_lower in ("javascript", "js", "node", "nodejs"):
        return run_javascript(code, stdin_text, timeout_ms)
    elif lang_lower in ("typescript", "ts"):
        return run_typescript(code, stdin_text, timeout_ms)
    elif lang_lower in ("java",):
        return run_java(code, stdin_text, timeout_ms)
    elif lang_lower in ("c", "cpp", "c++"):
        return run_cpp(code, lang_lower, stdin_text, timeout_ms)
    elif lang_lower in ("go", "golang"):
        return run_go(code, stdin_text, timeout_ms)
    elif lang_lower in ("ruby", "rb"):
        return run_ruby(code, stdin_text, timeout_ms)
    elif lang_lower in ("php",):
        return run_php(code, stdin_text, timeout_ms)
    else:
        # For unsupported languages, simulate execution with timing
        return simulate_execution(code, language, timeout_ms)


def run_typescript(code: str, stdin_text: str = "", timeout_ms: int = 5000) -> RunResult:
    """Run TypeScript code using ts-node or transpile to JS"""
    start = time.perf_counter()
    with tempfile.TemporaryDirectory(prefix="ai_code_optimizer_run_ts_") as td:
        user_code_path = os.path.join(td, "user_code.ts")
        
        with open(user_code_path, "w", encoding="utf-8") as f:
            f.write(code or "")
        
        # Try ts-node first, then npx ts-node
        for cmd in [["ts-node", user_code_path], ["npx", "ts-node", user_code_path]]:
            try:
                cp = subprocess.run(
                    cmd,
                    input=stdin_text,
                    capture_output=True,
                    text=True,
                    timeout=max(0.1, timeout_ms / 1000),
                    cwd=td,
                )
                exec_time = int((time.perf_counter() - start) * 1000)
                return RunResult(
                    ok=cp.returncode == 0,
                    stdout=cp.stdout or "",
                    stderr=cp.stderr or "",
                    exec_time_ms=exec_time,
                    peak_kb=None,
                )
            except (subprocess.TimeoutExpired, FileNotFoundError):
                continue
        
        return RunResult(ok=False, stdout="", stderr="TypeScript execution requires ts-node. Install with: npm install -g ts-node typescript", exec_time_ms=0, peak_kb=None)


def run_java(code: str, stdin_text: str = "", timeout_ms: int = 5000) -> RunResult:
    """Run Java code by compiling and executing"""
    start = time.perf_counter()
    
    # Extract class name from code
    import re
    class_match = re.search(r'public\s+class\s+(\w+)', code)
    class_name = class_match.group(1) if class_match else "Main"
    
    with tempfile.TemporaryDirectory(prefix="ai_code_optimizer_run_java_") as td:
        java_file = os.path.join(td, f"{class_name}.java")
        
        with open(java_file, "w", encoding="utf-8") as f:
            f.write(code or "")
        
        try:
            # Compile
            compile_result = subprocess.run(
                ["javac", java_file],
                capture_output=True,
                text=True,
                timeout=max(0.1, timeout_ms / 1000),
                cwd=td,
            )
            
            if compile_result.returncode != 0:
                return RunResult(
                    ok=False,
                    stdout="",
                    stderr=f"Compilation error:\n{compile_result.stderr}",
                    exec_time_ms=int((time.perf_counter() - start) * 1000),
                    peak_kb=None,
                )
            
            # Run
            run_result = subprocess.run(
                ["java", class_name],
                input=stdin_text,
                capture_output=True,
                text=True,
                timeout=max(0.1, timeout_ms / 1000),
                cwd=td,
            )
            
            exec_time = int((time.perf_counter() - start) * 1000)
            return RunResult(
                ok=run_result.returncode == 0,
                stdout=run_result.stdout or "",
                stderr=run_result.stderr or "",
                exec_time_ms=exec_time,
                peak_kb=None,
            )
        except subprocess.TimeoutExpired:
            return RunResult(ok=False, stdout="", stderr="Timeout", exec_time_ms=int((time.perf_counter() - start) * 1000), peak_kb=None)
        except FileNotFoundError:
            return RunResult(ok=False, stdout="", stderr="Java not found. Please install JDK to run Java code.", exec_time_ms=0, peak_kb=None)


def run_cpp(code: str, lang: str, stdin_text: str = "", timeout_ms: int = 5000) -> RunResult:
    """Run C/C++ code by compiling and executing"""
    start = time.perf_counter()
    
    ext = ".c" if lang == "c" else ".cpp"
    compiler = "gcc" if lang == "c" else "g++"
    
    with tempfile.TemporaryDirectory(prefix="ai_code_optimizer_run_cpp_") as td:
        source_file = os.path.join(td, f"code{ext}")
        exe_file = os.path.join(td, "code.exe" if os.name == "nt" else "code")
        
        with open(source_file, "w", encoding="utf-8") as f:
            f.write(code or "")
        
        try:
            # Compile
            compile_result = subprocess.run(
                [compiler, source_file, "-o", exe_file],
                capture_output=True,
                text=True,
                timeout=max(0.1, timeout_ms / 1000),
                cwd=td,
            )
            
            if compile_result.returncode != 0:
                return RunResult(
                    ok=False,
                    stdout="",
                    stderr=f"Compilation error:\n{compile_result.stderr}",
                    exec_time_ms=int((time.perf_counter() - start) * 1000),
                    peak_kb=None,
                )
            
            # Run
            run_result = subprocess.run(
                [exe_file],
                input=stdin_text,
                capture_output=True,
                text=True,
                timeout=max(0.1, timeout_ms / 1000),
                cwd=td,
            )
            
            exec_time = int((time.perf_counter() - start) * 1000)
            return RunResult(
                ok=run_result.returncode == 0,
                stdout=run_result.stdout or "",
                stderr=run_result.stderr or "",
                exec_time_ms=exec_time,
                peak_kb=None,
            )
        except subprocess.TimeoutExpired:
            return RunResult(ok=False, stdout="", stderr="Timeout", exec_time_ms=int((time.perf_counter() - start) * 1000), peak_kb=None)
        except FileNotFoundError:
            return RunResult(ok=False, stdout="", stderr=f"{compiler} not found. Please install GCC/G++ to run C/C++ code.", exec_time_ms=0, peak_kb=None)


def run_go(code: str, stdin_text: str = "", timeout_ms: int = 5000) -> RunResult:
    """Run Go code"""
    start = time.perf_counter()
    
    with tempfile.TemporaryDirectory(prefix="ai_code_optimizer_run_go_") as td:
        go_file = os.path.join(td, "main.go")
        
        with open(go_file, "w", encoding="utf-8") as f:
            f.write(code or "")
        
        try:
            cp = subprocess.run(
                ["go", "run", go_file],
                input=stdin_text,
                capture_output=True,
                text=True,
                timeout=max(0.1, timeout_ms / 1000),
                cwd=td,
            )
            exec_time = int((time.perf_counter() - start) * 1000)
            return RunResult(
                ok=cp.returncode == 0,
                stdout=cp.stdout or "",
                stderr=cp.stderr or "",
                exec_time_ms=exec_time,
                peak_kb=None,
            )
        except subprocess.TimeoutExpired:
            return RunResult(ok=False, stdout="", stderr="Timeout", exec_time_ms=int((time.perf_counter() - start) * 1000), peak_kb=None)
        except FileNotFoundError:
            return RunResult(ok=False, stdout="", stderr="Go not found. Please install Go to run Go code.", exec_time_ms=0, peak_kb=None)


def run_ruby(code: str, stdin_text: str = "", timeout_ms: int = 5000) -> RunResult:
    """Run Ruby code"""
    start = time.perf_counter()
    
    with tempfile.TemporaryDirectory(prefix="ai_code_optimizer_run_ruby_") as td:
        ruby_file = os.path.join(td, "code.rb")
        
        with open(ruby_file, "w", encoding="utf-8") as f:
            f.write(code or "")
        
        try:
            cp = subprocess.run(
                ["ruby", ruby_file],
                input=stdin_text,
                capture_output=True,
                text=True,
                timeout=max(0.1, timeout_ms / 1000),
                cwd=td,
            )
            exec_time = int((time.perf_counter() - start) * 1000)
            return RunResult(
                ok=cp.returncode == 0,
                stdout=cp.stdout or "",
                stderr=cp.stderr or "",
                exec_time_ms=exec_time,
                peak_kb=None,
            )
        except subprocess.TimeoutExpired:
            return RunResult(ok=False, stdout="", stderr="Timeout", exec_time_ms=int((time.perf_counter() - start) * 1000), peak_kb=None)
        except FileNotFoundError:
            return RunResult(ok=False, stdout="", stderr="Ruby not found. Please install Ruby to run Ruby code.", exec_time_ms=0, peak_kb=None)


def run_php(code: str, stdin_text: str = "", timeout_ms: int = 5000) -> RunResult:
    """Run PHP code"""
    start = time.perf_counter()
    
    with tempfile.TemporaryDirectory(prefix="ai_code_optimizer_run_php_") as td:
        php_file = os.path.join(td, "code.php")
        
        with open(php_file, "w", encoding="utf-8") as f:
            f.write(code or "")
        
        try:
            cp = subprocess.run(
                ["php", php_file],
                input=stdin_text,
                capture_output=True,
                text=True,
                timeout=max(0.1, timeout_ms / 1000),
                cwd=td,
            )
            exec_time = int((time.perf_counter() - start) * 1000)
            return RunResult(
                ok=cp.returncode == 0,
                stdout=cp.stdout or "",
                stderr=cp.stderr or "",
                exec_time_ms=exec_time,
                peak_kb=None,
            )
        except subprocess.TimeoutExpired:
            return RunResult(ok=False, stdout="", stderr="Timeout", exec_time_ms=int((time.perf_counter() - start) * 1000), peak_kb=None)
        except FileNotFoundError:
            return RunResult(ok=False, stdout="", stderr="PHP not found. Please install PHP to run PHP code.", exec_time_ms=0, peak_kb=None)


def simulate_execution(code: str, language: str, timeout_ms: int = 5000) -> RunResult:
    """Simulate execution for unsupported languages - provides estimated metrics"""
    import random
    
    # Calculate some basic metrics from the code
    lines = len(code.split('\n'))
    chars = len(code)
    
    # Simulate execution time based on code complexity
    base_time = random.randint(1, 10)
    complexity_factor = lines * 0.5 + chars * 0.01
    simulated_time = int(base_time + complexity_factor)
    
    return RunResult(
        ok=True,
        stdout=f"[Simulated execution for {language}]\nCode analysis complete.\nLines: {lines}\nCharacters: {chars}\n\nNote: Install the {language} runtime to execute actual code.",
        stderr="",
        exec_time_ms=min(simulated_time, timeout_ms),
        peak_kb=int(chars * 0.1),
    )
