"""Output comparator â€” compare two execution outputs with different matching modes."""
from __future__ import annotations

import re
from typing import List


def _parse_floats(text: str) -> List[float]:
    """Extract all floats from a string."""
    return [float(m) for m in re.findall(r'-?\d+\.?\d*(?:[eE][+-]?\d+)?', text)]


def compare(out_a: str, out_b: str, mode: str = "exact", epsilon: float = 1e-6) -> dict:
    """Compare two outputs.

    Modes
    -----
    exact : str
        Byte-for-byte comparison (after stripping trailing whitespace per line).
    numeric_tolerance : str
        Parse all numbers, compare within epsilon.
    order_independent : str
        Sort lines, then compare.

    Returns
    -------
    dict
        ``{match: bool, mode: str, diff_summary: str}``
    """
    a = out_a.strip()
    b = out_b.strip()

    if mode == "exact":
        # Normalize trailing whitespace per line
        a_lines = [line.rstrip() for line in a.splitlines()]
        b_lines = [line.rstrip() for line in b.splitlines()]
        match = a_lines == b_lines
        diff = ""
        if not match:
            diffs = []
            max_lines = max(len(a_lines), len(b_lines))
            for i in range(min(max_lines, 10)):
                la = a_lines[i] if i < len(a_lines) else "<missing>"
                lb = b_lines[i] if i < len(b_lines) else "<missing>"
                if la != lb:
                    diffs.append(f"Line {i + 1}: '{la}' vs '{lb}'")
            if len(a_lines) != len(b_lines):
                diffs.append(f"Line count: {len(a_lines)} vs {len(b_lines)}")
            diff = "; ".join(diffs[:5])
        return {"match": match, "mode": mode, "diff_summary": diff}

    elif mode == "numeric_tolerance":
        floats_a = _parse_floats(a)
        floats_b = _parse_floats(b)
        if len(floats_a) != len(floats_b):
            return {
                "match": False,
                "mode": mode,
                "diff_summary": f"Number count differs: {len(floats_a)} vs {len(floats_b)}",
            }
        mismatches = []
        for i, (fa, fb) in enumerate(zip(floats_a, floats_b)):
            if abs(fa - fb) > epsilon:
                mismatches.append(f"#{i + 1}: {fa} vs {fb} (delta={abs(fa - fb):.2e})")
        match = len(mismatches) == 0
        diff = "; ".join(mismatches[:5]) if mismatches else ""
        return {"match": match, "mode": mode, "diff_summary": diff}

    elif mode == "order_independent":
        a_sorted = sorted(a.splitlines())
        b_sorted = sorted(b.splitlines())
        match = a_sorted == b_sorted
        diff = ""
        if not match:
            a_set = set(a.splitlines())
            b_set = set(b.splitlines())
            only_a = a_set - b_set
            only_b = b_set - a_set
            parts = []
            if only_a:
                parts.append(f"Only in A: {list(only_a)[:3]}")
            if only_b:
                parts.append(f"Only in B: {list(only_b)[:3]}")
            diff = "; ".join(parts)
        return {"match": match, "mode": mode, "diff_summary": diff}

    else:
        return {"match": False, "mode": mode, "diff_summary": f"Unknown mode: {mode}"}
