from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from mongodb_auth_models import MongoOAuthProvider
from mongodb_auth_routes import get_current_user
from github_service import GitHubService

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

@router.get("/repos/{owner}/{repo}/contents")
async def get_contents(owner: str, repo: str, path: str = "", service: GitHubService = Depends(get_gh_service)):
    try:
        return await service.list_contents(f"{owner}/{repo}", path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/repos/{owner}/{repo}/file")
async def get_file(owner: str, repo: str, path: str, service: GitHubService = Depends(get_gh_service)):
    try:
        content = await service.get_file_content(f"{owner}/{repo}", path)
        return {"content": content}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/repos/{owner}/{repo}/pr")
async def create_pr(
    owner: str, repo: str, title: str, head: str, base: str, body: str = "", 
    service: GitHubService = Depends(get_gh_service)
):
    try:
        return await service.create_pull_request(f"{owner}/{repo}", title, head, base, body)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
