"""Non-LLM baselines (Priority 7): conventional optimization per language.

- C++: same source compiled -O0 vs -O2 (compiler optimization baseline).
- Java: same source JIT-default vs -Xint interpreted (runtime baseline).
- Python/JavaScript: no compiler knob exists, so the baseline is the
  reference (oracle) solution's measured runtime — documented, not faked.
"""
import subprocess
import tempfile
import os


def _timed_run(cmd, stdin, cwd, timeout):
    import time
    try:
        t0 = time.perf_counter()
        p = subprocess.run(cmd, input=stdin, capture_output=True, text=True,
                           timeout=timeout, cwd=cwd)
        dt = (time.perf_counter() - t0) * 1000
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        return None, f"{type(e).__name__}"
    if p.returncode != 0:
        return None, f"EXIT{p.returncode}:{p.stderr.strip()[:200]}"
    return {"stdout": p.stdout, "ms": dt}, ""


def cpp_o0_vs_o2(code, stdin, timeout=60):
    """Compile once at -O0 and -O2, run both. Returns dict with wall times."""
    import tempfile as _tf
    with _tf.TemporaryDirectory(prefix="tradcpp_") as td:
        src = os.path.join(td, "p.cpp")
        open(src, "w", encoding="utf-8").write(code)
        exes = {}
        for opt in ("-O0", "-O2"):
            exe = os.path.join(td, "p_O0.exe" if opt == "-O0" else "p_O2.exe")
            p = subprocess.run(["g++", src, "-o", exe, opt], capture_output=True,
                               text=True, timeout=120, cwd=td)
            if p.returncode != 0:
                return {"ok": False, "error": f"compile {opt}: {p.stderr[:200]}"}
            exes[opt] = exe
        out = {}
        for opt, exe in exes.items():
            res, err = _timed_run([exe], stdin, td, timeout)
            if res is None:
                return {"ok": False, "error": f"run {opt}: {err}"}
            out[opt] = res
        if out["-O0"]["stdout"] != out["-O2"]["stdout"]:
            return {"ok": False, "error": "O0/O2 outputs differ"}
        t0, t2 = out["-O0"]["ms"], out["-O2"]["ms"]
        return {"ok": True, "o0_ms": t0, "o2_ms": t2,
                "compiler_speedup": (t0 / t2) if t2 > 0 else None}


def java_jit_vs_interp(code, stdin, timeout=60):
    """Same bytecode, JIT default vs -Xint. Returns wall times or skip."""
    import tempfile as _tf
    with _tf.TemporaryDirectory(prefix="tradj_") as td:
        src = os.path.join(td, "Main.java")
        open(src, "w", encoding="utf-8").write(code)
        p = subprocess.run(["javac", src], capture_output=True, text=True,
                           timeout=60, cwd=td)
        if p.returncode != 0:
            return {"ok": False, "error": f"compile: {p.stderr[:200]}"}
        out = {}
        for mode, cmd in (("jit", ["java", "Main"]),
                          ("interp", ["java", "-Xint", "Main"])):
            res, err = _timed_run(cmd, stdin, td, timeout)
            if res is None:
                return {"ok": False, "error": f"run {mode}: {err}"}
            out[mode] = res
        if out["jit"]["stdout"] != out["interp"]["stdout"]:
            return {"ok": False, "error": "jit/interp outputs differ"}
        ti, tj = out["interp"]["ms"], out["jit"]["ms"]
        return {"ok": True, "interp_ms": ti, "jit_ms": tj,
                "jit_speedup": (ti / tj) if tj > 0 else None}
