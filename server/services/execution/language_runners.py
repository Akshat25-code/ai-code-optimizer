"""Per-language code runners (Python, JS, TS, Java, C/C++, Go, Ruby, PHP).

Each runner supports both Docker and subprocess execution paths.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
import time
from dataclasses import dataclass, asdict

from services.execution.docker_runner import (
    should_use_docker,
    run_in_docker,
    get_image,
    _safe_subprocess_run,
)


@dataclass
class RunResult:
    ok: bool
    stdout: str
    stderr: str
    exec_time_ms: int
    peak_kb: int | None = None


def to_dict(r: RunResult) -> dict:
    return asdict(r)


# --------------- Python wrapper (sandboxed builtins) ---------------

_PYTHON_WRAPPER = r"""
import io, json, os, sys, time, tracemalloc

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

def main():
    user_code_path = sys.argv[1]
    stdin_text = sys.argv[2] if len(sys.argv) > 2 else ""
    try:
        with open(user_code_path, "r", encoding="utf-8") as f:
            user_code = f.read()
    except Exception as e:
        print(json.dumps({"ok": False, "stdout": "", "stderr": f"Failed to read code: {e}", "exec_time_ms": 0, "peak_kb": None}))
        return
    out_buf, err_buf = io.StringIO(), io.StringIO()
    old_out, old_err, old_in = sys.stdout, sys.stderr, sys.stdin
    sys.stdout, sys.stderr, sys.stdin = out_buf, err_buf, io.StringIO(stdin_text)
    ok = True
    start = time.perf_counter()
    tracemalloc.start()
    try:
        compiled = compile(user_code, "<user_code>", "exec")
        safe_mode = os.getenv("RUNNER_SAFE_MODE", "1") == "1"
        if safe_mode:
            exec(compiled, {"__name__": "__main__", "__builtins__": _build_safe_builtins()}, {})
        else:
            exec(compiled, {"__name__": "__main__"}, {})
    except SystemExit as e:
        ok = False; err_buf.write(f"SystemExit: {e}\n")
    except Exception as e:
        ok = False; err_buf.write(f"{type(e).__name__}: {e}\n")
    finally:
        current, peak = tracemalloc.get_traced_memory(); tracemalloc.stop()
        end = time.perf_counter()
        sys.stdout, sys.stderr, sys.stdin = old_out, old_err, old_in
    print(json.dumps({"ok": ok, "stdout": out_buf.getvalue(), "stderr": err_buf.getvalue(),
                       "exec_time_ms": int((end-start)*1000), "peak_kb": int(peak/1024)}, ensure_ascii=False))

if __name__ == "__main__":
    main()
"""


def _find_python_exe() -> str:
    """Locate the best Python executable."""
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


def run_python(code: str, stdin_text: str = "", timeout_ms: int = 5000) -> RunResult:
    start = time.perf_counter()
    with tempfile.TemporaryDirectory(prefix="aico_py_") as td:
        wp = os.path.join(td, "wrapper.py")
        up = os.path.join(td, "user_code.py")
        with open(wp, "w", encoding="utf-8") as f:
            f.write(_PYTHON_WRAPPER)
        with open(up, "w", encoding="utf-8") as f:
            f.write(code or "")
        try:
            if should_use_docker():
                cp = run_in_docker(get_image("python"),
                    ["python", "wrapper.py", "user_code.py", stdin_text],
                    td, max(0.1, timeout_ms / 1000), stdin_text)
            else:
                cp = _safe_subprocess_run(
                    [_find_python_exe(), wp, up, stdin_text],
                    timeout_s=max(0.1, timeout_ms / 1000))
        except subprocess.TimeoutExpired:
            return RunResult(False, "", "Timeout", int((time.perf_counter() - start) * 1000))
        try:
            payload = json.loads((cp.stdout or "").strip() or "{}")
            return RunResult(
                ok=bool(payload.get("ok")),
                stdout=str(payload.get("stdout", "")),
                stderr=str(payload.get("stderr", "")) + (cp.stderr or ""),
                exec_time_ms=int(payload.get("exec_time_ms", int((time.perf_counter() - start) * 1000))),
                peak_kb=payload.get("peak_kb"))
        except Exception:
            return RunResult(False, cp.stdout or "", (cp.stderr or "") or "Parse error",
                             int((time.perf_counter() - start) * 1000))


def run_javascript(code: str, stdin_text: str = "", timeout_ms: int = 5000) -> RunResult:
    start = time.perf_counter()
    with tempfile.TemporaryDirectory(prefix="aico_js_") as td:
        fp = os.path.join(td, "user_code.js")
        with open(fp, "w", encoding="utf-8") as f:
            f.write(code or "")
        try:
            if should_use_docker():
                cp = run_in_docker(get_image("javascript"), ["node", "user_code.js"],
                    td, max(0.1, timeout_ms / 1000), stdin_text)
            else:
                cp = _safe_subprocess_run(["node", fp], stdin_text=stdin_text,
                    timeout_s=max(0.1, timeout_ms / 1000))
            return RunResult(cp.returncode == 0, cp.stdout or "", cp.stderr or "",
                             int((time.perf_counter() - start) * 1000))
        except subprocess.TimeoutExpired:
            return RunResult(False, "", "Timeout", int((time.perf_counter() - start) * 1000))
        except FileNotFoundError:
            return RunResult(False, "", "Node.js not found.", 0)


def run_typescript(code: str, stdin_text: str = "", timeout_ms: int = 5000) -> RunResult:
    start = time.perf_counter()
    with tempfile.TemporaryDirectory(prefix="aico_ts_") as td:
        fp = os.path.join(td, "user_code.ts")
        with open(fp, "w", encoding="utf-8") as f:
            f.write(code or "")
        try:
            if should_use_docker():
                cp = run_in_docker(get_image("typescript"), ["npx", "ts-node", "user_code.ts"],
                    td, max(0.1, timeout_ms / 1000), stdin_text)
                return RunResult(cp.returncode == 0, cp.stdout or "", cp.stderr or "",
                                 int((time.perf_counter() - start) * 1000))
            for cmd in [["ts-node", fp], ["npx", "ts-node", fp]]:
                try:
                    cp = _safe_subprocess_run(cmd, stdin_text=stdin_text,
                        timeout_s=max(0.1, timeout_ms / 1000), cwd=td)
                    return RunResult(cp.returncode == 0, cp.stdout or "", cp.stderr or "",
                                     int((time.perf_counter() - start) * 1000))
                except (subprocess.TimeoutExpired, FileNotFoundError):
                    continue
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        return RunResult(False, "", "TypeScript requires ts-node.", 0)


def run_java(code: str, stdin_text: str = "", timeout_ms: int = 5000) -> RunResult:
    start = time.perf_counter()
    class_match = re.search(r'public\s+class\s+(\w+)', code)
    class_name = class_match.group(1) if class_match else "Main"
    with tempfile.TemporaryDirectory(prefix="aico_java_") as td:
        fp = os.path.join(td, f"{class_name}.java")
        with open(fp, "w", encoding="utf-8") as f:
            f.write(code or "")
        try:
            if should_use_docker():
                img = get_image("java")
                cr = run_in_docker(img, ["javac", f"{class_name}.java"], td, max(0.1, timeout_ms / 1000))
                if cr.returncode != 0:
                    return RunResult(False, "", f"Compilation error:\n{cr.stderr}",
                                     int((time.perf_counter() - start) * 1000))
                rr = run_in_docker(img, ["java", class_name], td, max(0.1, timeout_ms / 1000), stdin_text)
            else:
                cr = _safe_subprocess_run(["javac", fp], timeout_s=max(0.1, timeout_ms / 1000), cwd=td)
                if cr.returncode != 0:
                    return RunResult(False, "", f"Compilation error:\n{cr.stderr}",
                                     int((time.perf_counter() - start) * 1000))
                rr = _safe_subprocess_run(["java", class_name], stdin_text=stdin_text,
                    timeout_s=max(0.1, timeout_ms / 1000), cwd=td)
            return RunResult(rr.returncode == 0, rr.stdout or "", rr.stderr or "",
                             int((time.perf_counter() - start) * 1000))
        except subprocess.TimeoutExpired:
            return RunResult(False, "", "Timeout", int((time.perf_counter() - start) * 1000))
        except FileNotFoundError:
            return RunResult(False, "", "Java not found.", 0)


def run_cpp(code: str, lang: str, stdin_text: str = "", timeout_ms: int = 5000) -> RunResult:
    start = time.perf_counter()
    ext = ".c" if lang == "c" else ".cpp"
    compiler_candidates = ["gcc", "clang", "cc"] if lang == "c" else ["g++", "clang++", "c++"]
    if not should_use_docker():
        available = [c for c in compiler_candidates if shutil.which(c)]
        if not available:
            return RunResult(False, "", f"No C/C++ compiler found. Tried: {', '.join(compiler_candidates)}", 0)
    with tempfile.TemporaryDirectory(prefix="aico_cpp_") as td:
        sf = os.path.join(td, f"code{ext}")
        exe = os.path.join(td, "code.exe" if os.name == "nt" else "code")
        with open(sf, "w", encoding="utf-8") as f:
            f.write(code or "")
        try:
            if should_use_docker():
                img = get_image(lang)
                compiler = "gcc" if lang == "c" else "g++"
                out_name = "code.exe" if os.name == "nt" else "code"
                cr = run_in_docker(img, [compiler, f"code{ext}", "-o", out_name], td, max(0.1, timeout_ms / 1000))
                if cr.returncode != 0:
                    return RunResult(False, "", "Compilation error:\n" + (cr.stderr or cr.stdout),
                                     int((time.perf_counter() - start) * 1000))
                rr = run_in_docker(img, [f"./{out_name}"], td, max(0.1, timeout_ms / 1000), stdin_text)
            else:
                cr = None
                for compiler in available:
                    attempt = _safe_subprocess_run([compiler, sf, "-o", exe],
                        timeout_s=max(0.1, timeout_ms / 1000), cwd=td)
                    if attempt.returncode == 0:
                        cr = attempt
                        break
                if cr is None:
                    return RunResult(False, "", "Compilation error", int((time.perf_counter() - start) * 1000))
                rr = _safe_subprocess_run([exe], stdin_text=stdin_text,
                    timeout_s=max(0.1, timeout_ms / 1000), cwd=td)
            return RunResult(rr.returncode == 0, rr.stdout or "", rr.stderr or "",
                             int((time.perf_counter() - start) * 1000))
        except subprocess.TimeoutExpired:
            return RunResult(False, "", "Timeout", int((time.perf_counter() - start) * 1000))
        except FileNotFoundError:
            return RunResult(False, "", "Compiler not found.", 0)


def run_go(code: str, stdin_text: str = "", timeout_ms: int = 5000) -> RunResult:
    start = time.perf_counter()
    with tempfile.TemporaryDirectory(prefix="aico_go_") as td:
        fp = os.path.join(td, "main.go")
        with open(fp, "w", encoding="utf-8") as f:
            f.write(code or "")
        try:
            if should_use_docker():
                cp = run_in_docker(get_image("go"), ["go", "run", "main.go"],
                    td, max(0.1, timeout_ms / 1000), stdin_text)
            else:
                cp = _safe_subprocess_run(["go", "run", fp], stdin_text=stdin_text,
                    timeout_s=max(0.1, timeout_ms / 1000), cwd=td)
            return RunResult(cp.returncode == 0, cp.stdout or "", cp.stderr or "",
                             int((time.perf_counter() - start) * 1000))
        except subprocess.TimeoutExpired:
            return RunResult(False, "", "Timeout", int((time.perf_counter() - start) * 1000))
        except FileNotFoundError:
            return RunResult(False, "", "Go not found.", 0)


def run_ruby(code: str, stdin_text: str = "", timeout_ms: int = 5000) -> RunResult:
    start = time.perf_counter()
    with tempfile.TemporaryDirectory(prefix="aico_ruby_") as td:
        fp = os.path.join(td, "code.rb")
        with open(fp, "w", encoding="utf-8") as f:
            f.write(code or "")
        try:
            if should_use_docker():
                cp = run_in_docker(get_image("ruby"), ["ruby", "code.rb"],
                    td, max(0.1, timeout_ms / 1000), stdin_text)
            else:
                cp = _safe_subprocess_run(["ruby", fp], stdin_text=stdin_text,
                    timeout_s=max(0.1, timeout_ms / 1000))
            return RunResult(cp.returncode == 0, cp.stdout or "", cp.stderr or "",
                             int((time.perf_counter() - start) * 1000))
        except subprocess.TimeoutExpired:
            return RunResult(False, "", "Timeout", int((time.perf_counter() - start) * 1000))
        except FileNotFoundError:
            return RunResult(False, "", "Ruby not found.", 0)


def run_php(code: str, stdin_text: str = "", timeout_ms: int = 5000) -> RunResult:
    start = time.perf_counter()
    with tempfile.TemporaryDirectory(prefix="aico_php_") as td:
        fp = os.path.join(td, "code.php")
        with open(fp, "w", encoding="utf-8") as f:
            f.write(code or "")
        try:
            if should_use_docker():
                cp = run_in_docker(get_image("php"), ["php", "code.php"],
                    td, max(0.1, timeout_ms / 1000), stdin_text)
            else:
                cp = _safe_subprocess_run(["php", fp], stdin_text=stdin_text,
                    timeout_s=max(0.1, timeout_ms / 1000))
            return RunResult(cp.returncode == 0, cp.stdout or "", cp.stderr or "",
                             int((time.perf_counter() - start) * 1000))
        except subprocess.TimeoutExpired:
            return RunResult(False, "", "Timeout", int((time.perf_counter() - start) * 1000))
        except FileNotFoundError:
            return RunResult(False, "", "PHP not found.", 0)
