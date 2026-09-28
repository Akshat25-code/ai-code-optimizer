"""GET /teams/mine + share-link creation (Team dashboard wiring)."""
import os
import sys
from datetime import datetime, timezone
from unittest.mock import patch, AsyncMock, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ.setdefault("SKIP_MONGO_INIT", "1")
os.environ.setdefault("ALLOW_FAKE_AI", "1")
os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")

from fastapi.testclient import TestClient
from main import app
from api.auth_routes import get_current_user


def _client_with_user(**overrides):
    user = {"id": "u1", "_id": "u1", "email": "a@b.com"}
    user.update(overrides)
    app.dependency_overrides[get_current_user] = lambda: user
    return TestClient(app)


def _async_cursor(docs):
    cur = MagicMock()
    cur.sort.return_value = cur

    async def _aiter():
        for d in docs:
            yield d
    cur.__aiter__ = lambda self: _aiter()
    return cur


def test_list_my_teams():
    docs = [{
        "_id": "t1", "name": "Eng", "owner_id": "u1",
        "members": [{"user_id": "u1", "role": "owner", "email": "a@b.com"}],
        "created_at": datetime.now(timezone.utc),
    }]
    mock_db = MagicMock()
    mock_db.teams.find.return_value = _async_cursor(docs)
    c = _client_with_user()
    try:
        with patch("api.team_routes.get_database", return_value=mock_db):
            r = c.get("/teams/mine")
        assert r.status_code == 200, r.text
        body = r.json()
        assert len(body) == 1 and body[0]["id"] == "t1"
        assert body[0]["is_owner"] is True
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_list_my_teams_db_unavailable():
    c = _client_with_user()
    try:
        with patch("api.team_routes.get_database", return_value=None):
            r = c.get("/teams/mine")
        assert r.status_code == 503
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_create_share_link():
    mock_db = MagicMock()
    mock_db.shared_sessions.insert_one = AsyncMock(return_value=MagicMock())
    c = _client_with_user()
    try:
        with patch("api.team_routes.get_database", return_value=mock_db):
            r = c.post("/share/", json={
                "session_id": "s1", "expires_in_hours": 24,
                "read_only": True, "snapshot_data": {"code": "print(1)"},
            })
        assert r.status_code == 200, r.text
        assert "token" in r.json()
    finally:
        app.dependency_overrides.pop(get_current_user, None)
