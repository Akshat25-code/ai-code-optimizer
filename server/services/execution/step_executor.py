"""Step-by-step algorithm tracer and pattern detector."""
from __future__ import annotations
from services.execution.sandbox_runner import trace_python

class StepExecutor:
    @staticmethod
    def trace(code: str, timeout_ms: int = 8000) -> dict:
        """Trace python code, apply heuristics, and return the visualization payload."""
        result = trace_python(code, timeout_ms)

        if not result.get("ok") and not result.get("steps"):
            return {
                "ok": False,
                "error": result.get("error", "Unknown error"),
                "pattern": "unknown",
                "steps": [],
                "step_count": 0,
                "truncated": False
            }

        steps = result.get("steps", [])
        pattern = StepExecutor.detect_pattern(steps)

        # Tag steps (simple heuristic for swaps/compares)
        StepExecutor._tag_steps(steps, pattern)

        return {
            "ok": result.get("ok", True),
            "error": result.get("error", ""),
            "pattern": pattern,
            "steps": steps,
            "step_count": len(steps),
            "truncated": result.get("truncated", False)
        }

    @staticmethod
    def detect_pattern(steps: list[dict]) -> str:
        """Heuristics to detect algorithm patterns based on variable usage."""
        if not steps:
            return "unknown"

        # Collect all variable names across all steps
        all_vars = set()
        for s in steps:
            all_vars.update(s.get("variables", {}).keys())

        # Look for Search indicators
        search_vars = {"left", "right", "low", "high", "mid", "target", "key", "lo", "hi"}
        if len(search_vars.intersection(all_vars)) >= 2:
            return "binary_search"

        # Look for Graph/Tree Traversal indicators
        traversal_vars = {"visited", "queue", "stack", "node", "adj", "graph", "dfs", "bfs"}
        if len(traversal_vars.intersection(all_vars)) >= 2:
            return "graph_traversal"

        # Look for Sorting indicators
        # Sorts usually have nested loops with i, j and do a lot of swaps/compares
        if len({"i", "j"}.intersection(all_vars)) == 2 and len({"arr", "nums", "a", "list", "array"}.intersection(set(v.lower() for v in all_vars))) >= 1:
            return "sorting"

        return "unknown"

    @staticmethod
    def _tag_steps(steps: list[dict], pattern: str):
        """Add operations tags to steps based on state changes."""
        if not steps:
            return

        prev_vars = steps[0].get("variables", {})

        for i in range(1, len(steps)):
            curr_vars = steps[i].get("variables", {})
            op = ""
            detail = ""

            if pattern == "sorting":
                # Detect array mutation (swap)
                for k, v in curr_vars.items():
                    if isinstance(v, list) and k in prev_vars and isinstance(prev_vars[k], list):
                        if v != prev_vars[k]:
                            op = "swap"
                            detail = f"Array {k} mutated"
                            break

                # If no swap but i/j changed, maybe a compare step
                if not op:
                    i_val = curr_vars.get("i")
                    j_val = curr_vars.get("j")
                    p_i_val = prev_vars.get("i")
                    p_j_val = prev_vars.get("j")

                    if i_val != p_i_val or j_val != p_j_val:
                        op = "compare"
                        detail = "Pointers moved"

            elif pattern == "binary_search":
                l_val = curr_vars.get("left", curr_vars.get("low"))
                r_val = curr_vars.get("right", curr_vars.get("high"))
                m_val = curr_vars.get("mid")

                pl_val = prev_vars.get("left", prev_vars.get("low"))
                pr_val = prev_vars.get("right", prev_vars.get("high"))
                pm_val = prev_vars.get("mid")

                if l_val != pl_val or r_val != pr_val:
                    op = "narrow"
                    detail = "Window narrowed"
                elif m_val != pm_val:
                    op = "compare"
                    detail = f"Checking mid={m_val}"

            elif pattern == "graph_traversal":
                v_val = curr_vars.get("visited")
                pv_val = prev_vars.get("visited")
                if v_val != pv_val:
                    op = "visit"
                    detail = "Node visited"

            steps[i]["operation"] = op
            steps[i]["detail"] = detail
            prev_vars = curr_vars
