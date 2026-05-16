"""Pytest fixtures — test database, client, auth helpers.

Uses SQLite in-memory for speed (unit tests).
Integration tests should use a real PostgreSQL instance.
All tests are independent — no shared mutable state.
"""

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.models.rider import Rider, ApprovalStatus, BikeType
from app.models.wallet import Wallet
from app.utils.security import get_password_hash, create_access_token


# ── In-memory SQLite DB for unit tests ───────────────────────────────────────
TEST_DB_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def reset_db():
    """Drop and recreate all tables before each test — guarantees isolation."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    """Yield a test database session."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client():
    """FastAPI TestClient."""
    return TestClient(app)


# ── User factories ─────────────────────────────────────────────────────────────

def make_user(db, email="user@test.com", password="password123", is_admin=False) -> User:
    user = User(
        id=uuid.uuid4(),
        email=email,
        hashed_password=get_password_hash(password),
        full_name="Test User",
        referral_code="TESTCODE",
        is_active=True,
        is_verified=True,
        is_admin=is_admin,
    )
    db.add(user)
    wallet = Wallet(id=uuid.uuid4(), user_id=user.id, balance=50.0)
    db.add(wallet)
    db.commit()
    db.refresh(user)
    return user


def make_rider(db, user: User, approved=True) -> Rider:
    rider = Rider(
        id=uuid.uuid4(),
        user_id=user.id,
        approval_status=ApprovalStatus.APPROVED if approved else ApprovalStatus.PENDING,
        bike_type=BikeType.STANDARD,
    )
    db.add(rider)
    db.commit()
    db.refresh(rider)
    return rider


def auth_headers(user: User) -> dict:
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}


def rider_auth_headers(rider: Rider) -> dict:
    token = create_access_token({"sub": str(rider.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_user(db):
    return make_user(db)


@pytest.fixture
def test_admin(db):
    return make_user(db, email="admin@test.com", is_admin=True)


@pytest.fixture
def test_rider(db, test_user):
    rider_user = make_user(db, email="rider@test.com")
    return make_rider(db, rider_user)


@pytest.fixture
def user_headers(test_user):
    return auth_headers(test_user)


@pytest.fixture
def admin_headers(test_admin):
    return auth_headers(test_admin)


@pytest.fixture
def rider_headers(test_rider):
    return rider_auth_headers(test_rider)
