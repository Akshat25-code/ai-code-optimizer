"""Pydantic request/response models for the Multi-File Project Workspace."""
from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field


class FileItem(BaseModel):
    """A single file in a project."""
    path: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., max_length=500_000)


class ProjectCreateReq(BaseModel):
    """Create a new project from a list of files."""
    name: str = Field(..., min_length=1, max_length=200)
    files: list[FileItem] = Field(..., min_length=1, max_length=500)


class ProjectUpdateFileReq(BaseModel):
    """Update a single file's content in a project."""
    content: str = Field(..., max_length=500_000)


# --- Response models ---

class TreeNode(BaseModel):
    """A node in the file tree (file or directory)."""
    name: str
    path: str
    type: str  # "file" or "directory"
    language: str | None = None
    lines: int | None = None
    size: int | None = None
    children: list[TreeNode] | None = None


class ProjectSummaryRes(BaseModel):
    """Returned after creating or fetching a project."""
    id: str
    name: str
    file_count: int
    total_lines: int
    language_breakdown: dict[str, int]
    avg_score: float
    created_at: str


class ProjectAnalysisRes(BaseModel):
    """Full project-level analysis result."""
    total_lines: int
    total_files: int
    language_breakdown: dict[str, int]
    avg_score: float
    hotspots: list[dict[str, Any]]
    per_file: dict[str, dict[str, Any]]


class DependencyGraphRes(BaseModel):
    """Dependency graph: file â†’ list of files it imports."""
    graph: dict[str, list[str]]
    cycles: list[list[str]]
    reverse_graph: dict[str, list[str]]
