from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from models.database import MongoOAuthProvider
from api.auth_routes import get_current_user
from services.github_service import GitHubService
import difflib


class ApplyPatchReq(BaseModel):
    file_path: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    title: str = Field(default="AI Code Optimizer: suggested improvements")
    body: str = Field(default="")


class DiffPreviewReq(BaseModel):
    file_path: str = Field(..., min_length=1)
    new_content: str = Field(..., min_length=1)
    ref: str = Field(default="", description="Branch to diff against (default branch if empty)")


router = APIRouter(prefix="/github", tags=["GitHub Integration"])

async def get_gh_service(current_user: dict = Depends(get_current_user)) -> GitHubService:
    token = await MongoOAuthProvider.find_token_by_user(current_user["id"], "github")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="GitHub account not linked. Please login with GitHub first."
        )
    return GitHubService(token)

@router.get("/repos")
async def list_repos(service: GitHubService = Depends(get_gh_service)):
    try:
        return await service.list_repositories()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/repos/{owner}/{repo}/branches")
async def list_branches(owner: str, repo: str, service: GitHubService = Depends(get_gh_service)):
    """List branches for a repository."""
    try:
        branches = await service.list_branches(f"{owner}/{repo}")
        default = await service.get_default_branch(f"{owner}/{repo}")
        return {
            "default_branch": default,
            "branches": [
                {"name": b["name"], "is_default": b["name"] == default}
                for b in branches
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/repos/{owner}/{repo}/contents")
async def get_contents(
    owner: str, repo: str, path: str = "", ref: str = "",
    service: GitHubService = Depends(get_gh_service),
):
    try:
        return await service.list_contents_ref(f"{owner}/{repo}", path, ref)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/repos/{owner}/{repo}/file")
async def get_file(
    owner: str, repo: str, path: str, ref: str = "",
    service: GitHubService = Depends(get_gh_service),
):
    try:
        content = await service.get_file_content_ref(f"{owner}/{repo}", path, ref)
        return {"content": content}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/repos/{owner}/{repo}/diff-preview")
async def diff_preview(
    owner: str, repo: str, payload: DiffPreviewReq,
    service: GitHubService = Depends(get_gh_service),
):
    """Preview unified diff of proposed changes against current file on a branch."""
    repo_full = f"{owner}/{repo}"
    try:
        ref = payload.ref or await service.get_default_branch(repo_full)
        original = await service.get_file_content_ref(repo_full, payload.file_path, ref)
    except Exception:
        original = ""

    original_lines = original.splitlines(keepends=True)
    new_lines = payload.new_content.splitlines(keepends=True)

    diff = list(difflib.unified_diff(
        original_lines, new_lines,
        fromfile=f"a/{payload.file_path}",
        tofile=f"b/{payload.file_path}",
        lineterm="",
    ))

    additions = sum(1 for line in diff if line.startswith("+") and not line.startswith("+++"))
    deletions = sum(1 for line in diff if line.startswith("-") and not line.startswith("---"))

    return {
        "diff": "\n".join(diff),
        "additions": additions,
        "deletions": deletions,
        "file_path": payload.file_path,
        "ref": ref if payload.ref else "(default)",
        "has_changes": len(diff) > 0,
    }


@router.post("/repos/{owner}/{repo}/pr")
async def create_pr(
    owner: str, repo: str, title: str, head: str, base: str, body: str = "",
    service: GitHubService = Depends(get_gh_service)
):
    try:
        return await service.create_pull_request(f"{owner}/{repo}", title, head, base, body)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/repos/{owner}/{repo}/apply-patch")
async def apply_patch_and_open_pr(
    owner: str,
    repo: str,
    payload: ApplyPatchReq,
    service: GitHubService = Depends(get_gh_service),
):
    """Create branch, commit optimized file, and open a pull request."""
    try:
        return await service.apply_patch_and_pr(
            f"{owner}/{repo}",
            payload.file_path,
            payload.content,
            title=payload.title,
            body=payload.body,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
