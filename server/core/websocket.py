"""WebSocket collaboration manager with OT-based concurrent editing."""
from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Dict, List, Optional
from fastapi import WebSocket


@dataclass
class EditOperation:
    """A single text edit operation for Operational Transform."""
    op_type: str  # "insert" or "delete"
    position: int  # character offset
    text: str = ""  # text to insert (insert) or text that was deleted (delete)
    length: int = 0  # number of chars deleted (delete only)
    user_id: str = ""
    revision: int = 0

    def to_dict(self) -> dict:
        return asdict(self)


def transform_operation(op_a: EditOperation, op_b: EditOperation) -> EditOperation:
    """Transform op_a against op_b (both applied to the same document state).

    Returns a new EditOperation that is op_a adjusted so it can be applied
    after op_b has already been applied.
    """
    # Same position tie-breaking: lower user_id wins (arbitrary but deterministic)
    a_pos = op_a.position
    b_pos = op_b.position

    if op_b.op_type == "insert":
        b_len = len(op_b.text)
        if a_pos > b_pos or (a_pos == b_pos and op_a.user_id > op_b.user_id):
            a_pos += b_len
    elif op_b.op_type == "delete":
        if a_pos > b_pos:
            a_pos = max(b_pos, a_pos - op_b.length)

    return EditOperation(
        op_type=op_a.op_type,
        position=a_pos,
        text=op_a.text,
        length=op_a.length,
        user_id=op_a.user_id,
        revision=op_a.revision,
    )


class CollaborationManager:
    def __init__(self):
        # session_id -> { websocket -> user_info_dict }
        self.rooms: Dict[str, Dict[WebSocket, dict]] = {}
        # session_id -> list of applied operations (op log for OT)
        self._op_log: Dict[str, List[EditOperation]] = {}
        # session_id -> current revision counter
        self._revision: Dict[str, int] = {}

    async def connect(self, session_id: str, websocket: WebSocket, user_info: dict = None):
        await websocket.accept()
        if session_id not in self.rooms:
            self.rooms[session_id] = {}
            self._op_log[session_id] = []
            self._revision[session_id] = 0

        if user_info is None:
            user_info = {"id": str(id(websocket)), "name": "anonymous"}
        user_info["cursor"] = None
        user_info["selection"] = None

        self.rooms[session_id][websocket] = user_info
        await self.broadcast_presence(session_id)

    async def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self.rooms:
            if websocket in self.rooms[session_id]:
                del self.rooms[session_id][websocket]

            if not self.rooms[session_id]:
                del self.rooms[session_id]
                self._op_log.pop(session_id, None)
                self._revision.pop(session_id, None)
            else:
                await self.broadcast_presence(session_id)

    async def handle_edit(
        self, session_id: str, websocket: WebSocket, op_data: dict
    ) -> Optional[EditOperation]:
        """Apply an edit operation with OT conflict resolution.

        Parameters
        ----------
        op_data : dict
            Keys: op_type, position, text, length, revision (client's last-seen rev).

        Returns the transformed operation (or None on error).
        """
        if session_id not in self.rooms or websocket not in self.rooms[session_id]:
            return None

        user_info = self.rooms[session_id][websocket]
        client_rev = op_data.get("revision", 0)

        op = EditOperation(
            op_type=op_data.get("op_type", "insert"),
            position=op_data.get("position", 0),
            text=op_data.get("text", ""),
            length=op_data.get("length", 0),
            user_id=str(user_info.get("id", "")),
            revision=client_rev,
        )

        # Transform against all operations that happened since client_rev
        log = self._op_log.get(session_id, [])
        for past_op in log[client_rev:]:
            op = transform_operation(op, past_op)

        # Assign new revision
        new_rev = self._revision.get(session_id, 0) + 1
        self._revision[session_id] = new_rev
        op.revision = new_rev
        self._op_log.setdefault(session_id, []).append(op)

        # Cap op log to prevent unbounded memory (keep last 1000 ops)
        if len(self._op_log[session_id]) > 1000:
            self._op_log[session_id] = self._op_log[session_id][-500:]

        # Broadcast transformed op to all OTHER clients
        await self.broadcast_to_room(
            session_id,
            {"type": "remote_edit", "operation": op.to_dict(), "revision": new_rev},
            exclude=websocket,
        )

        # ACK the sender with the assigned revision
        await self.send_personal_message(
            {"type": "edit_ack", "revision": new_rev}, websocket
        )

        return op

    async def handle_comment(
        self, session_id: str, websocket: WebSocket, comment_data: dict
    ):
        """Broadcast a line comment to all users in the room.

        comment_data keys: line, text, comment_id (optional).
        """
        if session_id not in self.rooms or websocket not in self.rooms[session_id]:
            return

        user_info = self.rooms[session_id][websocket]
        message = {
            "type": "line_comment",
            "user_id": str(user_info.get("id", "")),
            "user_name": user_info.get("name", "anonymous"),
            "line": comment_data.get("line"),
            "text": comment_data.get("text", ""),
            "comment_id": comment_data.get("comment_id"),
        }

        # Broadcast to everyone including sender (so they get the server-assigned data)
        await self.broadcast_to_room(session_id, message)

    async def broadcast_to_room(
        self, session_id: str, message: dict, exclude: WebSocket = None
    ):
        if session_id in self.rooms:
            for connection in list(self.rooms[session_id].keys()):
                if connection != exclude:
                    try:
                        await connection.send_json(message)
                    except Exception:
                        pass

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except Exception:
            pass

    async def broadcast_presence(self, session_id: str):
        if session_id in self.rooms:
            presence_list = list(self.rooms[session_id].values())
            await self.broadcast_to_room(
                session_id, {"type": "presence_update", "users": presence_list}
            )

    async def update_cursor(
        self,
        session_id: str,
        websocket: WebSocket,
        cursor: dict,
        selection: dict = None,
    ):
        if session_id in self.rooms and websocket in self.rooms[session_id]:
            self.rooms[session_id][websocket]["cursor"] = cursor
            self.rooms[session_id][websocket]["selection"] = selection
            await self.broadcast_presence(session_id)


manager = CollaborationManager()
