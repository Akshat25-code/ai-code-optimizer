"""Run generated unit tests in an isolated temp directory."""
from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from typing import Any


def run_pytest(source_code: str, test_code: str, timeout_s: float = 15.0) -> dict[str, Any]:
    tmp = tempfile.mkdtemp(prefix="aco_tests_")
    try:
        module_path = os.path.join(tmp, "target.py")
        test_path = os.path.join(tmp, "test_target.py")
        with open(module_path, "w", encoding="utf-8") as f:
            f.write(source_code)
        with open(test_path, "w", encoding="utf-8") as f:
            if "import target" not in test_code and "from target" not in test_code:
                test_code = f"from target import *\n\n{test_code}"
            f.write(test_code)

        proc = subprocess.run(
            ["python", "-m", "pytest", test_path, "-q", "--tb=short"],
            capture_output=True,
            text=True,
            timeout=timeout_s,
            cwd=tmp,
        )
        output = (proc.stdout or "") + (proc.stderr or "")
        passed = proc.returncode == 0
        passed_count = output.count(" passed")
        failed_count = output.count(" failed")
        return {
            "passed": passed,
            "exit_code": proc.returncode,
            "output": output.strip(),
            "summary": f"Tests {'passed' if passed else 'failed'}",
            "passed_count": passed_count,
            "failed_count": failed_count,
        }
    except subprocess.TimeoutExpired:
        return {"passed": False, "exit_code": -1, "output": "Test run timed out", "summary": "Timeout"}
    except FileNotFoundError:
        return {"passed": False, "exit_code": -1, "output": "pytest not installed", "summary": "pytest unavailable"}
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
