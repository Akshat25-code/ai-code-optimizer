"""Detect and redact secrets before sending code to AI providers.

Supports 20+ secret patterns across major cloud providers and services.
Exports findings in SARIF 2.1.0 format for IDE/CI integration.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

PATTERNS: list[tuple[str, re.Pattern[str], str, str]] = [
    # Cloud provider keys
    ("openai_key", re.compile(r"sk-[a-zA-Z0-9]{20,}"), "OpenAI API key", "Critical"),
    ("anthropic_key", re.compile(r"sk-ant-[a-zA-Z0-9\-_]{20,}"), "Anthropic API key", "Critical"),
    ("aws_key", re.compile(r"AKIA[0-9A-Z]{16}"), "AWS access key", "Critical"),
    ("aws_secret", re.compile(r"(?i)aws[_-]?secret[_-]?access[_-]?key\s*[:=]\s*['\"][A-Za-z0-9/+=]{40}['\"]"), "AWS secret key", "Critical"),
    ("gcp_key", re.compile(r"AIza[0-9A-Za-z\-_]{35}"), "Google Cloud API key", "Critical"),
    ("gcp_service_account", re.compile(r'"type"\s*:\s*"service_account"'), "GCP service account JSON", "Critical"),
    ("azure_key", re.compile(r"(?i)(azure|az)[_-]?(storage|account)?[_-]?key\s*[:=]\s*['\"][A-Za-z0-9+/=]{44,}['\"]"), "Azure storage key", "Critical"),
    # Database connection strings
    ("mongodb_uri", re.compile(r"mongodb(\+srv)?://[^\s'\"]+"), "MongoDB connection string", "Critical"),
    ("postgres_uri", re.compile(r"postgres(ql)?://[^\s'\"]+"), "PostgreSQL connection string", "Critical"),
    ("mysql_uri", re.compile(r"mysql://[^\s'\"]+"), "MySQL connection string", "Critical"),
    ("redis_uri", re.compile(r"redis://[^\s'\"]+"), "Redis connection string", "High"),
    # Token patterns
    ("github_token", re.compile(r"ghp_[a-zA-Z0-9]{36}"), "GitHub personal access token", "Critical"),
    ("github_oauth", re.compile(r"gho_[a-zA-Z0-9]{36}"), "GitHub OAuth token", "Critical"),
    ("gitlab_token", re.compile(r"glpat-[a-zA-Z0-9\-_]{20,}"), "GitLab personal access token", "Critical"),
    ("slack_token", re.compile(r"xox[baprs]-[0-9a-zA-Z\-]{10,}"), "Slack token", "Critical"),
    ("slack_webhook", re.compile(r"https://hooks\.slack\.com/services/T[A-Z0-9]+/B[A-Z0-9]+/[a-zA-Z0-9]+"), "Slack webhook URL", "High"),
    ("stripe_key", re.compile(r"(sk|pk)_(test|live)_[0-9a-zA-Z]{24,}"), "Stripe API key", "Critical"),
    ("npm_token", re.compile(r"npm_[a-zA-Z0-9]{36}"), "npm access token", "Critical"),
    ("pypi_token", re.compile(r"pypi-[A-Za-z0-9\-_]{50,}"), "PyPI API token", "Critical"),
    ("sendgrid_key", re.compile(r"SG\.[a-zA-Z0-9\-_]{22}\.[a-zA-Z0-9\-_]{43}"), "SendGrid API key", "Critical"),
    ("twilio_key", re.compile(r"SK[0-9a-fA-F]{32}"), "Twilio API key", "High"),
    # Crypto keys
    ("private_key", re.compile(r"-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"), "Private key block", "Critical"),
    # Generic secrets
    ("jwt_secret", re.compile(r"(?i)(jwt[_-]?secret|secret[_-]?key)\s*[:=]\s*['\"][^'\"]{8,}['\"]"), "JWT/secret key", "High"),
    ("generic_secret", re.compile(
        r"""(?ix)(api[_-]?key|secret|token|password|private[_-]?key)\s*[:=]\s*['"][^'"]{6,}['"]"""
    ), "Hardcoded secret", "High"),
    # Dangerous code patterns
    ("unsafe_eval", re.compile(r"\beval\s*\("), "Unsafe eval()", "High"),
    ("unsafe_exec", re.compile(r"\bexec\s*\("), "Unsafe exec()", "High"),
    ("subprocess_shell", re.compile(r"subprocess\.(call|run|Popen)\([^)]*shell\s*=\s*True"), "Shell subprocess", "High"),
    ("hardcoded_ip", re.compile(r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b(?!.*(?:version|mask|subnet))"), "Hardcoded IP address", "Medium"),
]


def scan_secrets(code: str, filename: str = "<input>") -> dict[str, Any]:
    """Scan code for secrets and dangerous patterns."""
    findings: list[dict[str, Any]] = []
    seen: set[tuple[int, str]] = set()

    for line_no, line in enumerate(code.splitlines(), start=1):
        for kind, pattern, label, severity in PATTERNS:
            for match in pattern.finditer(line):
                key = (line_no, kind)
                if key in seen:
                    continue
                seen.add(key)
                snippet = line.strip()
                if len(snippet) > 120:
                    snippet = snippet[:117] + "..."
                findings.append({
                    "kind": kind,
                    "label": label,
                    "file": filename,
                    "line": line_no,
                    "column": match.start() + 1,
                    "end_column": match.end() + 1,
                    "snippet": snippet,
                    "severity": severity,
                })

    return {
        "count": len(findings),
        "has_secrets": len(findings) > 0,
        "findings": findings,
        "recommendation": "Redact secrets before sending to AI" if findings else "No secrets detected",
        "summary": _summarize(findings),
    }


def _summarize(findings: list[dict]) -> dict[str, int]:
    """Count findings by severity."""
    counts = {"Critical": 0, "High": 0, "Medium": 0}
    for f in findings:
        counts[f["severity"]] = counts.get(f["severity"], 0) + 1
    return counts


def redact_secrets(code: str) -> tuple[str, int]:
    """Replace detected secrets with [REDACTED_SECRET] placeholder."""
    redacted = code
    count = 0
    for _kind, pattern, _label, _sev in PATTERNS:
        def _repl(m: re.Match[str]) -> str:
            nonlocal count
            count += 1
            return "[REDACTED_SECRET]"

        redacted, n = pattern.subn(_repl, redacted)
        count += n
    return redacted, count


# ---------------------------------------------------------------------------
# SARIF 2.1.0 Export
# ---------------------------------------------------------------------------
TOOL_NAME = "aco-secret-scanner"
TOOL_VERSION = "2.0.0"
SARIF_SCHEMA = "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/main/sarif-2.1/schema/sarif-schema-2.1.0.json"

_SEVERITY_TO_SARIF_LEVEL = {
    "Critical": "error",
    "High": "warning",
    "Medium": "note",
}


def to_sarif(scan_result: dict[str, Any], filename: str = "<input>") -> dict[str, Any]:
    """Convert scan_secrets() output to SARIF 2.1.0 JSON."""
    findings = scan_result.get("findings", [])

    # Build rule index
    rules_seen: dict[str, int] = {}
    rules: list[dict] = []
    results: list[dict] = []

    for f in findings:
        kind = f["kind"]
        if kind not in rules_seen:
            rules_seen[kind] = len(rules)
            rules.append({
                "id": kind,
                "shortDescription": {"text": f["label"]},
                "defaultConfiguration": {
                    "level": _SEVERITY_TO_SARIF_LEVEL.get(f["severity"], "warning")
                },
                "properties": {"severity": f["severity"]},
            })

        results.append({
            "ruleId": kind,
            "ruleIndex": rules_seen[kind],
            "level": _SEVERITY_TO_SARIF_LEVEL.get(f["severity"], "warning"),
            "message": {"text": f"{f['label']} detected"},
            "locations": [{
                "physicalLocation": {
                    "artifactLocation": {"uri": f.get("file", filename)},
                    "region": {
                        "startLine": f["line"],
                        "startColumn": f.get("column", 1),
                        "endColumn": f.get("end_column", f.get("column", 1)),
                    },
                }
            }],
        })

    return {
        "$schema": SARIF_SCHEMA,
        "version": "2.1.0",
        "runs": [{
            "tool": {
                "driver": {
                    "name": TOOL_NAME,
                    "version": TOOL_VERSION,
                    "rules": rules,
                }
            },
            "results": results,
            "invocations": [{
                "executionSuccessful": True,
                "endTimeUtc": datetime.now(timezone.utc).isoformat(),
            }],
        }],
    }
