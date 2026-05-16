"""Development seed data — creates test users, riders, promos, and sample rides.

Run: python seed.py
"""

import sys
import os
import uuid
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine, Base
from app.models import User, Rider, Wallet, WalletTransaction, PromoCode, PromoUsage, Ride, Rating
from app.models.rider import ApprovalStatus, BikeType, RiderStatus
from app.models.ride import RideStatus, PaymentMethod
from app.models.wallet import TransactionType
from app.models.promo import PromoType
from app.utils.security import get_password_hash

Base.metadata.create_all(bind=engine)

db = SessionLocal()

print("🌱 Seeding database...")


def make_wallet(user_id, balance=50.0):
    wallet = Wallet(id=uuid.uuid4(), user_id=user_id, balance=balance)
    db.add(wallet)
    return wallet


# ── Admin ──────────────────────────────────────────────────────────────────────
admin = User(
    id=uuid.uuid4(),
    email="admin@rideandchill.fi",
    hashed_password=get_password_hash("admin123"),
    full_name="Admin",
    referral_code="ADMIN000",
    is_active=True,
    is_verified=True,
    is_admin=True,
)
db.add(admin)
make_wallet(admin.id, balance=0)

# ── Regular users ──────────────────────────────────────────────────────────────
users = []
for i in range(1, 4):
    u = User(
        id=uuid.uuid4(),
        email=f"user{i}@test.com",
        hashed_password=get_password_hash("test123"),
        full_name=f"Test User {i}",
        referral_code=f"USER{i:04d}",
        is_active=True,
        is_verified=True,
    )
    db.add(u)
    make_wallet(u.id, balance=50.0)
    users.append(u)

# ── Riders ─────────────────────────────────────────────────────────────────────
rider_users = []
for i in range(1, 4):
    ru = User(
        id=uuid.uuid4(),
        email=f"rider{i}@test.com",
        hashed_password=get_password_hash("test123"),
        full_name=f"Test Rider {i}",
        referral_code=f"RIDER{i:03d}",
        is_active=True,
        is_verified=True,
    )
    db.add(ru)
    make_wallet(ru.id, balance=0)
    rider_users.append(ru)

db.flush()

riders = []
bike_types = [BikeType.STANDARD, BikeType.ELECTRIC, BikeType.STANDARD]
for i, ru in enumerate(rider_users):
    r = Rider(
        id=uuid.uuid4(),
        user_id=ru.id,
        status=RiderStatus.ONLINE if i == 0 else RiderStatus.OFFLINE,
        approval_status=ApprovalStatus.APPROVED,
        bike_type=bike_types[i],
        current_lat=63.838 + i * 0.002,
        current_lng=23.130 + i * 0.001,
        total_rides=10 + i * 5,
        average_rating=4.5 + i * 0.1,
        total_earnings=120.0 + i * 50,
    )
    db.add(r)
    riders.append(r)

# ── Promo codes ────────────────────────────────────────────────────────────────
now = datetime.now(tz=timezone.utc)
promos = [
    PromoCode(
        id=uuid.uuid4(),
        code="FIRST10",
        type=PromoType.PERCENTAGE,
        value=10,
        min_order_value=0,
        max_discount=5.0,
        max_uses=100,
        current_uses=0,
        is_active=True,
        valid_from=now - timedelta(days=1),
        valid_until=now + timedelta(days=365),
    ),
    PromoCode(
        id=uuid.uuid4(),
        code="KOKKOLA5",
        type=PromoType.FIXED,
        value=5.0,
        min_order_value=8.0,
        max_discount=5.0,
        max_uses=50,
        current_uses=3,
        is_active=True,
        valid_from=now - timedelta(days=30),
        valid_until=now + timedelta(days=60),
    ),
    PromoCode(
        id=uuid.uuid4(),
        code="FREERIDE",
        type=PromoType.FREE_RIDE,
        value=0,
        min_order_value=0,
        max_discount=999,
        max_uses=10,
        current_uses=0,
        is_active=True,
        valid_from=now,
        valid_until=now + timedelta(days=7),
    ),
]
for p in promos:
    db.add(p)

# ── Sample completed rides ─────────────────────────────────────────────────────
db.flush()
for i in range(5):
    ride_time = now - timedelta(hours=i + 2)
    ride = Ride(
        id=uuid.uuid4(),
        user_id=users[i % len(users)].id,
        rider_id=riders[i % len(riders)].id,
        origin_address="Kauppatori, Kokkola",
        destination_address=f"Destination {i + 1}, Kokkola",
        origin_lat=63.838,
        origin_lng=23.130,
        destination_lat=63.85 + i * 0.003,
        destination_lng=23.14 + i * 0.002,
        distance_km=2.0 + i * 0.5,
        duration_minutes=8 + i * 2,
        base_price=3.0,
        surge_multiplier=1.0,
        final_price=round(3.0 + (2.0 + i * 0.5) * 1.5, 2),
        tip_amount=round(i * 0.5, 2),
        is_surge=False,
        bike_type=BikeType.STANDARD,
        payment_method=PaymentMethod.WALLET,
        status=RideStatus.COMPLETED,
        requested_at=ride_time,
        accepted_at=ride_time + timedelta(minutes=1),
        arrived_at=ride_time + timedelta(minutes=3),
        started_at=ride_time + timedelta(minutes=4),
        completed_at=ride_time + timedelta(minutes=12),
    )
    db.add(ride)
    db.flush()

    rating = Rating(
        id=uuid.uuid4(),
        ride_id=ride.id,
        from_user_id=ride.user_id,
        to_rider_id=ride.rider_id,
        stars=4 + (i % 2),
        comment="Great ride!" if i % 2 == 0 else None,
        tip_amount=ride.tip_amount,
    )
    db.add(rating)

db.commit()
print("✅ Seed complete!")
print("\nTest accounts:")
print("  Admin:  admin@rideandchill.fi / admin123")
print("  Users:  user1@test.com / test123 (and user2, user3)")
print("  Riders: rider1@test.com / test123 (and rider2, rider3)")
print("\nPromo codes: FIRST10, KOKKOLA5, FREERIDE")
db.close()
