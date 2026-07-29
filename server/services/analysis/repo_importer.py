"""
Repository Importer and Context Compressor.
Reads a local directory or ZIP, ignores files via .gitignore patterns,
and extracts function/class signatures (AST for Python, regex for JS/TS) to compress context.
"""
import ast
import fnmatch
import os
import re
import zipfile
from pathlib import Path
from typing import Dict, List, Optional, Any

SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "env", "dist", "build", ".pytest_cache", ".next", "coverage"}
SKIP_EXTS = {".pyc", ".pyo", ".pyd", ".so", ".dll", ".exe", ".bin", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".mp4", ".mp3", ".wav", ".pdf", ".zip", ".tar", ".gz"}

class PythonSignatureExtractor(ast.NodeVisitor):
    def __init__(self):
        self.signatures = []

    def visit_FunctionDef(self, node):
        args = [a.arg for a in node.args.args]
        self.signatures.append(f"def {node.name}({', '.join(args)}): ...")
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node):
        args = [a.arg for a in node.args.args]
        self.signatures.append(f"async def {node.name}({', '.join(args)}): ...")
        self.generic_visit(node)

    def visit_ClassDef(self, node):
        bases = [b.id for b in node.bases if isinstance(b, ast.Name)]
        bases_str = f"({', '.join(bases)})" if bases else ""
        self.signatures.append(f"class {node.name}{bases_str}:")
        for item in node.body:
            if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                args = [a.arg for a in item.args.args]
                prefix = "async " if isinstance(item, ast.AsyncFunctionDef) else ""
                self.signatures.append(f"    {prefix}def {item.name}({', '.join(args)}): ...")

def compress_python(content: str) -> str:
    try:
        tree = ast.parse(content)
        extractor = PythonSignatureExtractor()
        extractor.visit(tree)
        if extractor.signatures:
            return "\n".join(extractor.signatures)
        return ""
    except Exception:
        # Fallback if AST parsing fails
        return compress_js_ts(content)

def compress_js_ts(content: str) -> str:
    """Regex-based fallback for JS/TS."""
    lines = content.splitlines()
    signatures = []

    # Very basic signature matching for JS/TS classes, functions, and exports
    pattern = re.compile(r'^(?:export\s+)?(?:default\s+)?(?:class|function|const\s+\w+\s*=\s*(?:async\s*)?(?:\([^)]*\)|[^=]*)\s*=>).*$')
    for line in lines:
        line_s = line.strip()
        if pattern.match(line_s):
            signatures.append(line_s)

    return "\n".join(signatures)

def compress_file_context(path: str, content: str) -> str:
    """Compress file content based on its extension."""
    if path.endswith(".py"):
        comp = compress_python(content)
        return comp if comp else content[:500] + "\n... (omitted)"
    elif path.endswith((".js", ".jsx", ".ts", ".tsx")):
        comp = compress_js_ts(content)
        return comp if comp else content[:500] + "\n... (omitted)"
    else:
        # Just return the first few lines of other text files
        return "\n".join(content.splitlines()[:20]) + "\n... (omitted)"

def _parse_gitignore(gitignore_path: str) -> List[str]:
    patterns = []
    try:
        with open(gitignore_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    patterns.append(line)
    except Exception:
        pass
    return patterns

def _should_skip(path: str, gitignore_patterns: List[str]) -> bool:
    name = os.path.basename(path)
    if name in SKIP_DIRS:
        return True
    _, ext = os.path.splitext(name)
    if ext.lower() in SKIP_EXTS:
        return True
    for pattern in gitignore_patterns:
        if fnmatch.fnmatch(name, pattern) or fnmatch.fnmatch(path, pattern):
            return True
    return False

def read_local_directory(root_path: str) -> List[Dict[str, str]]:
    """Reads a local directory, applying exclusions, and returns a list of {path, content}."""
    files = []
    root = Path(root_path).resolve()

    gitignore_path = root / ".gitignore"
    patterns = _parse_gitignore(str(gitignore_path))

    for dirpath, dirnames, filenames in os.walk(root):
        # Mutate dirnames to skip unwanted directories
        dirnames[:] = [d for d in dirnames if not _should_skip(os.path.join(dirpath, d), patterns)]

        for file in filenames:
            full_path = os.path.join(dirpath, file)
            rel_path = os.path.relpath(full_path, root)
            if _should_skip(rel_path, patterns):
                continue

            try:
                with open(full_path, "r", encoding="utf-8") as f:
                    content = f.read()
                files.append({"path": rel_path.replace("\\", "/"), "content": content})
            except Exception:
                pass  # Skip unreadable files (e.g. binary)

    return files

def process_imported_repo(files: List[Dict[str, str]], compress: bool = True) -> Dict[str, Any]:
    """Compresses the context to fit into LLM token limits and bundles it."""
    bundled_context = []
    total_original_lines = 0
    total_compressed_lines = 0

    for f in files:
        total_original_lines += len(f["content"].splitlines())

        if compress:
            compressed = compress_file_context(f["path"], f["content"])
            total_compressed_lines += len(compressed.splitlines())
            bundled_context.append(f"--- File: {f['path']} ---\n{compressed}\n")
        else:
            total_compressed_lines += len(f["content"].splitlines())
            bundled_context.append(f"--- File: {f['path']} ---\n{f['content']}\n")

    return {
        "file_count": len(files),
        "total_original_lines": total_original_lines,
        "total_compressed_lines": total_compressed_lines,
        "bundled_context": "\n".join(bundled_context),
        "files": files
    }
