import httpx
from typing import List, Dict, Any, Optional

class GitHubService:
    BASE_URL = "https://api.github.com"
    
    def __init__(self, token: str):
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }

    async def list_repositories(self) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{self.BASE_URL}/user/repos?sort=updated&per_page=50", headers=self.headers)
            r.raise_for_status()
            return r.json()

    async def list_contents(self, repo_full_name: str, path: str = "") -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{self.BASE_URL}/repos/{repo_full_name}/contents/{path}", headers=self.headers)
            r.raise_for_status()
            return r.json()

    async def get_file_content(self, repo_full_name: str, path: str) -> str:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{self.BASE_URL}/repos/{repo_full_name}/contents/{path}", headers=self.headers)
            r.raise_for_status()
            data = r.json()
            if data.get("encoding") == "base64":
                import base64
                return base64.b64decode(data["content"]).decode("utf-8")
            return data.get("content", "")

    async def create_pull_request(self, repo_full_name: str, title: str, head: str, base: str, body: str = ""):
        async with httpx.AsyncClient(timeout=10.0) as client:
            payload = {"title": title, "head": head, "base": base, "body": body}
            r = await client.post(f"{self.BASE_URL}/repos/{repo_full_name}/pulls", headers=self.headers, json=payload)
            r.raise_for_status()
            return r.json()

    async def create_or_update_file(self, repo_full_name: str, path: str, message: str, content: str, branch: str, sha: Optional[str] = None):
        import base64
        async with httpx.AsyncClient(timeout=10.0) as client:
            payload = {
                "message": message,
                "content": base64.b64encode(content.encode("utf-8")).decode("utf-8"),
                "branch": branch
            }
            if sha:
                payload["sha"] = sha
            r = await client.put(f"{self.BASE_URL}/repos/{repo_full_name}/contents/{path}", headers=self.headers, json=payload)
            r.raise_for_status()
            return r.json()
