"""Shared reproducibility header for research scripts (#31)."""
from __future__ import annotations

import datetime
import platform
import subprocess
import sys


def git_sha() -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            text=True, stderr=subprocess.DEVNULL,
        ).strip()
    except Exception:
        return "unknown"


def header(ai_version: str) -> str:
    now = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    return (
        f"_meta: generated={now} git={git_sha()} "
        f"python={platform.python_version()} ai={ai_version}"
    )
