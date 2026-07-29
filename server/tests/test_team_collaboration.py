"""Tests for Team Collaboration & Workspaces (Feature 9)."""
import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from bson import ObjectId


# We will just unit-test the WebSocket collaboration manager logic directly here
# since it contains the core concurrent editing logic.
from core.websocket import CollaborationManager


@pytest.mark.asyncio
async def test_collaboration_manager_connect():
    """Test that users can connect and presence is tracked."""
    manager = CollaborationManager()

    # Mock WebSocket
    class MockWS:
        def __init__(self, id_):
            self.id = id_
            self.messages = []

        async def accept(self):
            pass

        async def send_json(self, msg):
            self.messages.append(msg)

    ws1 = MockWS("ws1")
    ws2 = MockWS("ws2")

    session_id = "sess_123"

    # User 1 connects
    await manager.connect(session_id, ws1, {"id": "u1", "name": "Alice", "color": "#red"})

    assert session_id in manager.rooms
    assert ws1 in manager.rooms[session_id]

    # User 2 connects
    await manager.connect(session_id, ws2, {"id": "u2", "name": "Bob", "color": "#blue"})

    assert len(manager.rooms[session_id]) == 2

    # Both should have received presence updates
    # The last message to ws1 should contain both users
    assert len(ws1.messages) > 0
    last_msg = ws1.messages[-1]
    assert last_msg["type"] == "presence_update"
    assert len(last_msg["users"]) == 2


@pytest.mark.asyncio
async def test_collaboration_manager_broadcast():
    """Test that broadcast_to_room skips the excluded sender."""
    manager = CollaborationManager()

    class MockWS:
        def __init__(self):
            self.messages = []
        async def accept(self): pass
        async def send_json(self, msg): self.messages.append(msg)

    ws1 = MockWS()
    ws2 = MockWS()
    session_id = "sess_456"

    await manager.connect(session_id, ws1, {"id": "u1"})
    await manager.connect(session_id, ws2, {"id": "u2"})

    # ws1 sends an edit, broadcast to everyone except ws1
    await manager.broadcast_to_room(session_id, {"type": "session_update", "data": "print('hello')"}, exclude=ws1)

    # ws2 should receive it, ws1 should NOT receive it
    assert len([m for m in ws2.messages if m.get("type") == "session_update"]) == 1
    assert len([m for m in ws1.messages if m.get("type") == "session_update"]) == 0


@pytest.mark.asyncio
async def test_collaboration_manager_disconnect():
    """Test that disconnect cleans up and broadcasts updated presence."""
    manager = CollaborationManager()

    class MockWS:
        def __init__(self):
            self.messages = []
        async def accept(self): pass
        async def send_json(self, msg): self.messages.append(msg)

    ws1 = MockWS()
    ws2 = MockWS()
    session_id = "sess_789"

    await manager.connect(session_id, ws1, {"id": "u1"})
    await manager.connect(session_id, ws2, {"id": "u2"})

    # ws1 disconnects
    await manager.disconnect(session_id, ws1)

    assert ws1 not in manager.rooms[session_id]
    assert ws2 in manager.rooms[session_id]

    # ws2 should receive presence update with just ws2
    last_msg = ws2.messages[-1]
    assert last_msg["type"] == "presence_update"
    assert len(last_msg["users"]) == 1
    assert last_msg["users"][0]["id"] == "u2"

    # ws2 disconnects
    await manager.disconnect(session_id, ws2)
    assert session_id not in manager.rooms
