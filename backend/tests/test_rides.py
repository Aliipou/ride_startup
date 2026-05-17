"""Integration tests for rides endpoints."""

from tests.conftest import make_user, make_rider, auth_headers


class TestRideEstimate:
    def test_estimate_returns_price_breakdown(self, client, db):
        user = make_user(db)
        resp = client.post(
            "/rides/estimate",
            json={
                "origin_lat": 63.838,
                "origin_lng": 23.130,
                "destination_lat": 63.856,
                "destination_lng": 23.150,
                "bike_type": "STANDARD",
            },
            headers=auth_headers(user),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "final_price" in data
        assert "base_fare" in data
        assert "distance_km" in data
        assert "duration_minutes" in data
        assert data["final_price"] >= 4.00  # minimum fare

    def test_estimate_requires_auth(self, client):
        resp = client.post("/rides/estimate", json={
            "origin_lat": 63.838, "origin_lng": 23.130,
            "destination_lat": 63.856, "destination_lng": 23.150,
            "bike_type": "STANDARD",
        })
        assert resp.status_code == 401

    def test_estimate_ebike_more_expensive(self, client, db):
        user = make_user(db)
        headers = auth_headers(user)
        params = {
            "origin_lat": 63.838, "origin_lng": 23.130,
            "destination_lat": 63.856, "destination_lng": 23.150,
        }
        standard = client.post("/rides/estimate", json={**params, "bike_type": "STANDARD"}, headers=headers)
        electric = client.post("/rides/estimate", json={**params, "bike_type": "ELECTRIC"}, headers=headers)
        assert electric.json()["final_price"] >= standard.json()["final_price"]


class TestRideHistory:
    def test_empty_history(self, client, db):
        user = make_user(db)
        resp = client.get("/rides/history", headers=auth_headers(user))
        assert resp.status_code == 200
        assert resp.json() == []

    def test_history_pagination(self, client, db):
        user = make_user(db)
        resp = client.get("/rides/history?limit=5&skip=0", headers=auth_headers(user))
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)


class TestRideGet:
    def test_get_nonexistent_ride(self, client, db):
        user = make_user(db)
        import uuid
        fake_id = str(uuid.uuid4())
        resp = client.get(f"/rides/{fake_id}", headers=auth_headers(user))
        assert resp.status_code == 404
