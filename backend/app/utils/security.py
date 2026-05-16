"""Security utilities: JWT, password hashing (Argon2), OTP, referral codes.

Password hashing: Argon2id — OWASP recommended (superior to bcrypt/scrypt).
  - time_cost=3, memory_cost=65536 KB, parallelism=4
JWT: HS256, 30-min access + 30-day refresh tokens.
"""

import random
import string
from datetime import datetime, timedelta, timezone
from typing import Any

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError
from fastapi import HTTPException, status
from jose import JWTError, jwt

from app.config import settings

# Argon2id — OWASP recommended parameters
_ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=4,
    hash_len=32,
    salt_len=16,
)

# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------


def get_password_hash(password: str) -> str:
    """Return an Argon2id hash of *password*."""
    return _ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if *plain_password* matches *hashed_password*."""
    try:
        return _ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(hashed_password: str) -> bool:
    """Return True if hash parameters need upgrading."""
    return _ph.check_needs_rehash(hashed_password)


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------


def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    """Encode a signed JWT access token.

    Args:
        data: Payload to encode (should include ``sub``).
        expires_delta: Token lifetime; defaults to ``ACCESS_TOKEN_EXPIRE_MINUTES``.

    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict[str, Any]) -> str:
    """Encode a signed JWT refresh token with a longer lifetime.

    Args:
        data: Payload to encode (should include ``sub``).

    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str, token_type: str = "access") -> dict[str, Any]:
    """Decode and validate a JWT token.

    Args:
        token: Raw JWT string.
        token_type: Expected ``type`` claim — ``"access"`` or ``"refresh"``.

    Returns:
        Decoded payload dictionary.

    Raises:
        HTTPException 401: If the token is invalid, expired, or has wrong type.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload: dict[str, Any] = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
    except JWTError:
        raise credentials_exception

    if payload.get("type") != token_type:
        raise credentials_exception

    if payload.get("sub") is None:
        raise credentials_exception

    return payload


# ---------------------------------------------------------------------------
# OTP / referral helpers
# ---------------------------------------------------------------------------


def generate_otp() -> str:
    """Return a random 6-digit OTP string."""
    return "".join(random.choices(string.digits, k=6))


def generate_referral_code() -> str:
    """Return a random 8-character alphanumeric referral code (uppercase)."""
    alphabet = string.ascii_uppercase + string.digits
    return "".join(random.choices(alphabet, k=8))
