"""Integration tests for admin endpoints.

Verifies admin-only authorization guard.
"""

from tests.conftest import make_user, make_rider, auth_headers


class TestAdminAuth:
    def test_non_admin_cannot_access_stats(self, client, db):
        user = make_user(db)
        resp = client.get("/admin/stats/today", headers=auth_headers(user))
        assert resp.status_code == 403

    def test_unauthenticated_cannot_access_admin(self, client):
        resp = client.get("/admin/stats/today")
        assert resp.status_code == 401

    def test_admin_can_access_stats(self, client, db):
        admin = make_user(db, email="admin@test.com", is_admin=True)
        resp = client.get("/admin/stats/today", headers=auth_headers(admin))
        assert resp.status_code == 200
        data = resp.json()
        assert "total_rides_today" in data
        assert "revenue_today" in data
        assert "active_riders" in data
        assert "new_users_today" in data


class TestRiderApproval:
    def test_approve_rider(self, client, db):
        admin = make_user(db, email="admin2@test.com", is_admin=True)
        rider_user = make_user(db, email="pending@test.com")
        rider = make_rider(db, rider_user, approved=False)

        resp = client.post(
            f"/admin/riders/{rider.id}/approve",
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "approved"

    def test_reject_rider_with_reason(self, client, db):
        admin = make_user(db, email="admin3@test.com", is_admin=True)
        rider_user = make_user(db, email="reject@test.com")
        rider = make_rider(db, rider_user, approved=False)

        resp = client.post(
            f"/admin/riders/{rider.id}/reject",
            json={"reason": "Incomplete documents"},
            headers=auth_headers(admin),
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "rejected"

    def test_approve_nonexistent_rider(self, client, db):
        import uuid
        admin = make_user(db, email="admin4@test.com", is_admin=True)
        resp = client.post(
            f"/admin/riders/{uuid.uuid4()}/approve",
            headers=auth_headers(admin),
        )
        assert resp.status_code == 404


class TestPricingConfig:
    def test_get_pricing(self, client, db):
        admin = make_user(db, email="admin5@test.com", is_admin=True)
        resp = client.get("/admin/pricing", headers=auth_headers(admin))
        assert resp.status_code == 200
        data = resp.json()
        assert "base_fare" in data
        assert "rate_per_km" in data
        assert "min_fare" in data
