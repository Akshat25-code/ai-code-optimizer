"""Docker container runner with resource limits and security isolation."""
from __future__ import annotations

import locale
import os
import shutil
import subprocess
from typing import Optional


def _safe_subprocess_run(
    cmd, timeout_s: float, cwd: str | None = None, stdin_text: str | None = None
):
    """Run subprocess with robust, platform-friendly decoding."""
    preferred_encoding = (
        os.getenv("RUNNER_OUTPUT_ENCODING")
        or locale.getpreferredencoding(False)
        or "utf-8"
    )
    kwargs = {
        "capture_output": True,
        "text": True,
        "encoding": preferred_encoding,
        "errors": "replace",
        "timeout": timeout_s,
    }
    if cwd is not None:
        kwargs["cwd"] = cwd
    if stdin_text is not None:
        kwargs["input"] = stdin_text
    return subprocess.run(cmd, **kwargs)


def should_use_docker() -> bool:
    """Check if Docker sandbox is enabled and available."""
    return os.getenv("USE_DOCKER_SANDBOX", "1") == "1" and bool(shutil.which("docker"))


def run_in_docker(
    image: str,
    cmd: list[str],
    td: str,
    timeout_s: float,
    stdin_text: str | None = None,
) -> subprocess.CompletedProcess:
    """Run code in a heavily restricted Docker container.

    Limits: 128MB RAM, 0.5 CPU, 64 PIDs, no network, all capabilities dropped.
    """
    docker_cmd = [
        "docker", "run", "--rm",
        "--network", "none",
        "--memory=128m",
        "--cpus=0.5",
        "--pids-limit=64",
        "--cap-drop=ALL",
        "-v", f"{os.path.abspath(td)}:/sandbox",
        "-w", "/sandbox",
        "-i",
        image,
    ] + cmd
    return _safe_subprocess_run(docker_cmd, timeout_s, cwd=td, stdin_text=stdin_text)


# Default Docker images per language
LANGUAGE_IMAGES = {
    "python": "python:3.12-alpine",
    "javascript": "node:20-alpine",
    "typescript": "node:20-alpine",
    "java": "eclipse-temurin:21-alpine",
    "c": "gcc:13",
    "cpp": "gcc:13",
    "go": "golang:1.22-alpine",
    "ruby": "ruby:3.3-alpine",
    "php": "php:8.3-cli-alpine",
}


def get_image(language: str) -> str:
    """Get the Docker image for a language, respecting env overrides."""
    env_key = f"SANDBOX_IMAGE_{language.upper()}"
    return os.getenv(env_key, LANGUAGE_IMAGES.get(language, "python:3.12-alpine"))
