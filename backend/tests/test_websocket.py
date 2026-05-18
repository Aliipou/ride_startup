"""WebSocket tests — connection, auth, message delivery."""

import uuid
import pytest
from app.utils.security import create_access_token
from tests.conftest import make_user


class TestUserWebSocket:
    def test_connects_with_valid_token(self, client, db):
        user = make_user(db)
        token = create_access_token({"sub": str(user.id)})
        with client.websocket_connect(f"/ws/user/{user.id}?token={token}") as ws:
            assert ws is not None

    def test_rejected_without_token(self, client, db):
        user = make_user(db)
        with pytest.raises(Exception):  # WebSocket close with 4001
            with client.websocket_connect(f"/ws/user/{user.id}") as ws:
                ws.receive_text()

    def test_rejected_with_wrong_user_id(self, client, db):
        user = make_user(db)
        token = create_access_token({"sub": str(user.id)})
        wrong_id = str(uuid.uuid4())
        with pytest.raises(Exception):
            with client.websocket_connect(f"/ws/user/{wrong_id}?token={token}") as ws:
                ws.receive_text()


class TestRiderWebSocket:
    def test_rider_connects_with_valid_token(self, client, db):
        from tests.conftest import make_rider
        user = make_user(db, email="riderws@test.com")
        rider = make_rider(db, user)
        token = create_access_token({"sub": str(rider.id)})
        with client.websocket_connect(f"/ws/rider/{rider.id}?token={token}") as ws:
            assert ws is not None


class TestConnectionManager:
    def test_send_to_disconnected_user_returns_false(self):
        """send_to_user should return False (not raise) for unknown user_id."""
        import asyncio
        from app.routers.ws import ConnectionManager

        mgr = ConnectionManager()
        result = asyncio.get_event_loop().run_until_complete(
            mgr.send_to_user("nonexistent-id", {"event": "test"})
        )
        assert result is False

    def test_disconnect_idempotent(self):
        """Disconnecting an already-disconnected user must not raise."""
        from app.routers.ws import ConnectionManager
        mgr = ConnectionManager()
        mgr.disconnect_user("ghost-id")  # Should not raise
        mgr.disconnect_rider("ghost-id")
