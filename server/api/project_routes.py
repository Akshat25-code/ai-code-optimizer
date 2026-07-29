"""Project Workspace API routes â€” CRUD for multi-file projects + analysis."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from api.auth_routes import get_current_user
from core.database import get_database, serialize_doc
from models.project_models import (
    ProjectCreateReq,
    ProjectUpdateFileReq,
)
from services.analysis.project_analyzer import (
    index_files,
    build_dependency_graph,
    aggregate_metrics,
    impact_of,
)

router = APIRouter(prefix="/projects", tags=["Project Workspace"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_project_or_404(
    project_id: str, user_id: str
) -> dict[str, Any]:
    """Fetch a project and verify ownership."""
    db = get_database()
    try:
        oid = ObjectId(project_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid project ID")
    project = await db.projects.find_one({"_id": oid})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not your project")
    return project


def _files_from_doc(project: dict[str, Any]) -> list[dict[str, str]]:
    """Extract the files list from a MongoDB project document."""
    return [
        {"path": f["path"], "content": f.get("content", "")}
        for f in project.get("files", [])
    ]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_project(
    req: ProjectCreateReq,
    current_user: dict = Depends(get_current_user),
):
    """Create a new project, run initial analysis, and store in MongoDB."""
    db = get_database()
    files_raw = [{"path": f.path, "content": f.content} for f in req.files]

    # Index files (tree + metadata)
    index = index_files(files_raw)

    # Quick language breakdown from index
    lang_breakdown: dict[str, int] = {}
    for meta in index["flat"].values():
        lang = meta.get("language")
        if lang:
            lang_breakdown[lang] = lang_breakdown.get(lang, 0) + 1

    now = datetime.now(timezone.utc)
    doc = {
        "user_id": current_user["id"],
        "name": req.name,
        "files": files_raw,
        "tree": index["tree"],
        "total_lines": index["total_lines"],
        "total_files": index["total_files"],
        "language_breakdown": lang_breakdown,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.projects.insert_one(doc)

    return {
        "id": str(result.inserted_id),
        "name": req.name,
        "file_count": index["total_files"],
        "total_lines": index["total_lines"],
        "language_breakdown": lang_breakdown,
        "created_at": now.isoformat(),
    }


@router.get("/")
async def list_projects(current_user: dict = Depends(get_current_user)):
    """List all projects owned by the current user."""
    db = get_database()
    cursor = db.projects.find(
        {"user_id": current_user["id"]},
        {
            "files": 0,  # Don't return file contents in listing
            "tree": 0,
        },
    ).sort("created_at", -1)
    projects = await cursor.to_list(100)
    return [serialize_doc(p) for p in projects]


@router.get("/{project_id}")
async def get_project(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get project metadata (without full file contents)."""
    project = await _get_project_or_404(project_id, current_user["id"])
    safe = serialize_doc(project)
    # Don't send all file contents in overview
    safe.pop("files", None)
    return safe


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a project."""
    await _get_project_or_404(project_id, current_user["id"])
    db = get_database()
    await db.projects.delete_one({"_id": ObjectId(project_id)})


@router.get("/{project_id}/tree")
async def get_project_tree(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get the file tree for a project."""
    project = await _get_project_or_404(project_id, current_user["id"])
    return {
        "tree": project.get("tree", []),
        "total_files": project.get("total_files", 0),
        "total_lines": project.get("total_lines", 0),
    }


@router.get("/{project_id}/files/{file_path:path}")
async def get_project_file(
    project_id: str,
    file_path: str,
    current_user: dict = Depends(get_current_user),
):
    """Get the content of a single file in a project."""
    project = await _get_project_or_404(project_id, current_user["id"])
    normalized = file_path.replace("\\", "/").lstrip("/")
    for f in project.get("files", []):
        if f["path"].replace("\\", "/").lstrip("/") == normalized:
            return {
                "path": f["path"],
                "content": f.get("content", ""),
            }
    raise HTTPException(status_code=404, detail=f"File not found: {file_path}")


@router.put("/{project_id}/files/{file_path:path}")
async def update_project_file(
    project_id: str,
    file_path: str,
    req: ProjectUpdateFileReq,
    current_user: dict = Depends(get_current_user),
):
    """Update a file's content in a project (e.g., after optimization)."""
    project = await _get_project_or_404(project_id, current_user["id"])
    db = get_database()
    normalized = file_path.replace("\\", "/").lstrip("/")

    # Find and update the file
    files = project.get("files", [])
    found = False
    for f in files:
        if f["path"].replace("\\", "/").lstrip("/") == normalized:
            f["content"] = req.content
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")

    # Re-index tree
    files_raw = [{"path": f["path"], "content": f.get("content", "")} for f in files]
    index = index_files(files_raw)

    await db.projects.update_one(
        {"_id": ObjectId(project_id)},
        {
            "$set": {
                "files": files,
                "tree": index["tree"],
                "total_lines": index["total_lines"],
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return {"path": file_path, "updated": True, "total_lines": index["total_lines"]}


@router.get("/{project_id}/analysis")
async def get_project_analysis(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Run full analysis on all project files â€” per-file scores, hotspots,
    language breakdown. Pure CS â€” no AI calls."""
    project = await _get_project_or_404(project_id, current_user["id"])
    files_raw = _files_from_doc(project)
    metrics = aggregate_metrics(files_raw)
    return metrics


@router.get("/{project_id}/dependencies")
async def get_project_dependencies(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Build cross-file dependency graph from import/require statements."""
    project = await _get_project_or_404(project_id, current_user["id"])
    files_raw = _files_from_doc(project)
    dep_info = build_dependency_graph(files_raw)
    return dep_info


@router.get("/{project_id}/impact/{file_path:path}")
async def get_file_impact(
    project_id: str,
    file_path: str,
    current_user: dict = Depends(get_current_user),
):
    """Show which files are affected if this file changes."""
    project = await _get_project_or_404(project_id, current_user["id"])
    files_raw = _files_from_doc(project)
    dep_info = build_dependency_graph(files_raw)
    normalized = file_path.replace("\\", "/").lstrip("/")
    impacted = impact_of(normalized, dep_info["reverse_graph"])
    return {
        "file": normalized,
        "impacted_files": impacted,
        "impacted_count": len(impacted),
    }
