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

    async def get_default_branch(self, repo_full_name: str) -> str:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{self.BASE_URL}/repos/{repo_full_name}", headers=self.headers)
            r.raise_for_status()
            return r.json().get("default_branch", "main")

    async def list_branches(self, repo_full_name: str, per_page: int = 30) -> List[Dict[str, Any]]:
        """List branches for a repo, including default branch flag."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                f"{self.BASE_URL}/repos/{repo_full_name}/branches?per_page={per_page}",
                headers=self.headers,
            )
            r.raise_for_status()
            return r.json()

    async def list_contents_ref(self, repo_full_name: str, path: str = "", ref: str = "") -> List[Dict[str, Any]]:
        """List contents at a specific branch/ref."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.BASE_URL}/repos/{repo_full_name}/contents/{path}"
            if ref:
                url += f"?ref={ref}"
            r = await client.get(url, headers=self.headers)
            r.raise_for_status()
            return r.json()

    async def get_file_content_ref(self, repo_full_name: str, path: str, ref: str = "") -> str:
        """Get file content at a specific branch/ref."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.BASE_URL}/repos/{repo_full_name}/contents/{path}"
            if ref:
                url += f"?ref={ref}"
            r = await client.get(url, headers=self.headers)
            r.raise_for_status()
            data = r.json()
            if data.get("encoding") == "base64":
                import base64
                return base64.b64decode(data["content"]).decode("utf-8")
            return data.get("content", "")

    async def create_branch(self, repo_full_name: str, branch_name: str, from_sha: str):
        async with httpx.AsyncClient(timeout=10.0) as client:
            payload = {"ref": f"refs/heads/{branch_name}", "sha": from_sha}
            r = await client.post(f"{self.BASE_URL}/repos/{repo_full_name}/git/refs", headers=self.headers, json=payload)
            r.raise_for_status()
            return r.json()

    async def get_branch_sha(self, repo_full_name: str, branch: str) -> str:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                f"{self.BASE_URL}/repos/{repo_full_name}/git/ref/heads/{branch}",
                headers=self.headers,
            )
            r.raise_for_status()
            return r.json()["object"]["sha"]

    async def get_file_sha(self, repo_full_name: str, path: str, ref: str = "") -> Optional[str]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"{self.BASE_URL}/repos/{repo_full_name}/contents/{path}"
            if ref:
                url += f"?ref={ref}"
            r = await client.get(url, headers=self.headers)
            if r.status_code == 404:
                return None
            r.raise_for_status()
            return r.json().get("sha")

    async def apply_patch_and_pr(
        self,
        repo_full_name: str,
        file_path: str,
        new_content: str,
        *,
        title: str,
        body: str = "",
        branch_prefix: str = "aco-optimize",
    ) -> dict:
        import base64
        from datetime import datetime, timezone

        default_branch = await self.get_default_branch(repo_full_name)
        base_sha = await self.get_branch_sha(repo_full_name, default_branch)
        ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        branch = f"{branch_prefix}-{ts}"

        await self.create_branch(repo_full_name, branch, base_sha)
        existing_sha = await self.get_file_sha(repo_full_name, file_path, ref=default_branch)

        async with httpx.AsyncClient(timeout=15.0) as client:
            payload = {
                "message": title,
                "content": base64.b64encode(new_content.encode("utf-8")).decode("utf-8"),
                "branch": branch,
            }
            if existing_sha:
                payload["sha"] = existing_sha
            r = await client.put(
                f"{self.BASE_URL}/repos/{repo_full_name}/contents/{file_path}",
                headers=self.headers,
                json=payload,
            )
            r.raise_for_status()
            commit_info = r.json()

        pr = await self.create_pull_request(repo_full_name, title, branch, default_branch, body)
        return {"branch": branch, "commit": commit_info, "pull_request": pr}
