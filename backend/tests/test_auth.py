"""Integration tests for auth endpoints.

Tests exercise the full HTTP stack: router → service → DB.
"""

from tests.conftest import make_user, auth_headers


class TestSignupEmail:
    def test_signup_success(self, client):
        resp = client.post("/auth/signup/email", json={
            "email": "new@test.com",
            "password": "securepassword",
            "full_name": "New User",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_signup_duplicate_email(self, client, db):
        make_user(db, email="dup@test.com")
        resp = client.post("/auth/signup/email", json={
            "email": "dup@test.com",
            "password": "password123",
            "full_name": "Dup User",
        })
        assert resp.status_code == 409

    def test_signup_invalid_email(self, client):
        resp = client.post("/auth/signup/email", json={
            "email": "not-an-email",
            "password": "password123",
            "full_name": "Bad Email",
        })
        assert resp.status_code == 422

    def test_signup_short_password(self, client):
        resp = client.post("/auth/signup/email", json={
            "email": "short@test.com",
            "password": "123",
            "full_name": "Short Pass",
        })
        assert resp.status_code == 422


class TestLoginEmail:
    def test_login_success_returns_tokens(self, client, db):
        make_user(db, email="login@test.com", password="password123")
        resp = client.post("/auth/login/email", json={
            "email": "login@test.com",
            "password": "password123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_login_wrong_password(self, client, db):
        make_user(db, email="wp@test.com", password="correct")
        resp = client.post("/auth/login/email", json={
            "email": "wp@test.com",
            "password": "wrong",
        })
        assert resp.status_code == 401

    def test_login_unknown_email(self, client):
        resp = client.post("/auth/login/email", json={
            "email": "nobody@test.com",
            "password": "password123",
        })
        assert resp.status_code == 401


class TestTokenRefresh:
    def test_refresh_returns_new_tokens(self, client, db):
        make_user(db, email="ref@test.com", password="password123")
        login = client.post("/auth/login/email", json={
            "email": "ref@test.com", "password": "password123"
        })
        refresh_token = login.json()["refresh_token"]

        resp = client.post("/auth/refresh", json={"refresh_token": refresh_token})
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_invalid_refresh_token(self, client):
        resp = client.post("/auth/refresh", json={"refresh_token": "invalid.token.here"})
        assert resp.status_code == 401


class TestProtectedRoutes:
    def test_protected_without_token_returns_401(self, client):
        resp = client.get("/users/me")
        assert resp.status_code == 401

    def test_protected_with_valid_token(self, client, db):
        user = make_user(db)
        resp = client.get("/users/me", headers=auth_headers(user))
        assert resp.status_code == 200

    def test_protected_with_garbage_token(self, client):
        resp = client.get("/users/me", headers={"Authorization": "Bearer garbage"})
        assert resp.status_code == 401


class TestLogout:
    def test_logout_returns_204(self, client, db):
        make_user(db, email="logout@test.com", password="password123")
        login = client.post("/auth/login/email", json={
            "email": "logout@test.com", "password": "password123"
        })
        refresh_token = login.json()["refresh_token"]
        resp = client.post("/auth/logout", json={"refresh_token": refresh_token})
        assert resp.status_code == 204
