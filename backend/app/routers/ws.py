"""WebSocket router — real-time communication for users and riders."""

import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from ..utils.security import verify_token

router = APIRouter()


class ConnectionManager:
    """Manages active WebSocket connections for users and riders."""

    def __init__(self) -> None:
        self.user_connections: dict[str, WebSocket] = {}
        self.rider_connections: dict[str, WebSocket] = {}

    async def connect_user(self, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self.user_connections[user_id] = ws

    async def connect_rider(self, rider_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self.rider_connections[rider_id] = ws

    def disconnect_user(self, user_id: str) -> None:
        self.user_connections.pop(user_id, None)

    def disconnect_rider(self, rider_id: str) -> None:
        self.rider_connections.pop(rider_id, None)

    async def send_to_user(self, user_id: str, data: dict) -> bool:
        """Send a message to a user. Returns False if user is not connected."""
        ws = self.user_connections.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(data))
                return True
            except Exception:
                self.disconnect_user(user_id)
        return False

    async def send_to_rider(self, rider_id: str, data: dict) -> bool:
        """Send a message to a rider. Returns False if rider is not connected."""
        ws = self.rider_connections.get(rider_id)
        if ws:
            try:
                await ws.send_text(json.dumps(data))
                return True
            except Exception:
                self.disconnect_rider(rider_id)
        return False


# Global connection manager (module-level singleton)
manager = ConnectionManager()


def _authenticate_ws(token: str | None) -> str:
    """Validate JWT from WebSocket query param. Returns sub (user/rider ID)."""
    if not token:
        return ""
    try:
        payload = verify_token(token, expected_type="access")
        return payload.get("sub", "")
    except Exception:
        return ""


@router.websocket("/ws/user/{user_id}")
async def user_ws(
    websocket: WebSocket,
    user_id: str,
    token: str | None = Query(default=None),
):
    """
    User WebSocket channel.
    Client receives: ride_accepted, rider_location, rider_arrived, ride_started, ride_completed, ride_cancelled
    Connect: WS /ws/user/{user_id}?token=<access_token>
    """
    sub = _authenticate_ws(token)
    if sub != user_id:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await manager.connect_user(user_id, websocket)
    try:
        # Keep connection alive — server pushes all events
        while True:
            # Accept ping/pong from client to detect disconnects
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_user(user_id)


@router.websocket("/ws/rider/{rider_id}")
async def rider_ws(
    websocket: WebSocket,
    rider_id: str,
    token: str | None = Query(default=None),
):
    """
    Rider WebSocket channel.
    Client receives: new_ride_request (30s timer), ride_cancelled
    Connect: WS /ws/rider/{rider_id}?token=<access_token>
    """
    sub = _authenticate_ws(token)
    if sub != rider_id:
        await websocket.close(code=4001, reason="Unauthorized")
        return

    await manager.connect_rider(rider_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_rider(rider_id)
