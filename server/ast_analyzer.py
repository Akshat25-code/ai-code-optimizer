import ast
import json

def calculate_complexity(node):
    """Simple cyclomatic complexity: 1 + number of branching points."""
    complexity = 1
    for child in ast.walk(node):
        if isinstance(child, (ast.If, ast.While, ast.For, ast.AsyncFor, ast.With, ast.AsyncWith, ast.And, ast.Or, ast.ExceptHandler)):
            complexity += 1
    return complexity

def analyze_python_ast(code: str) -> str:
    """Parses Python code and extracts structural metadata as JSON string."""
    try:
        tree = ast.parse(code)
    except Exception:
        return ""

    metadata = {
        "classes": [],
        "functions": [],
        "imports": [],
        "total_lines": len(code.splitlines()),
        "docstrings_present": False
    }

    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            metadata["classes"].append({
                "name": node.name,
                "complexity": calculate_complexity(node),
                "methods": [n.name for n in node.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
            })
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            metadata["functions"].append({
                "name": node.name,
                "args": [a.arg for a in node.args.args],
                "complexity": calculate_complexity(node),
                "is_async": isinstance(node, ast.AsyncFunctionDef)
            })
        elif isinstance(node, ast.Import):
            for alias in node.names:
                metadata["imports"].append(alias.name)
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                metadata["imports"].append(node.module)

    # Global checks
    metadata["docstrings_present"] = any(ast.get_docstring(n) for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.ClassDef, ast.Module)))
    
    return json.dumps(metadata, indent=2)
