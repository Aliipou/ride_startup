"""Authentication service — signup, login, OTP, Google OAuth, token refresh/logout."""

import json
import uuid
from datetime import timedelta

import redis as redis_lib
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User
from app.schemas.auth import (
    LoginEmailRequest,
    LoginGoogleRequest,
    SignupEmailRequest,
    SignupPhoneRequest,
    TokenResponse,
    VerifyOTPRequest,
)
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    generate_otp,
    generate_referral_code,
    get_password_hash,
    verify_password,
    verify_token,
)

_OTP_TTL_SECONDS = 300  # 5 minutes
_OTP_TOKEN_TTL_SECONDS = 600  # 10 minutes


def _get_redis() -> redis_lib.Redis:
    return redis_lib.from_url(settings.REDIS_URL, decode_responses=True)


def _build_tokens(user: User) -> TokenResponse:
    """Build access + refresh token pair for *user*."""
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def _resolve_referrer(db: Session, referral_code: str | None) -> User | None:
    """Look up a user by their referral code."""
    if not referral_code:
        return None
    return db.query(User).filter(User.referral_code == referral_code).first()


# ---------------------------------------------------------------------------
# Email signup / login
# ---------------------------------------------------------------------------


def signup_email(db: Session, data: SignupEmailRequest) -> TokenResponse:
    """Register a new user with email and password.

    Args:
        db: Database session.
        data: Signup payload.

    Returns:
        JWT token pair.

    Raises:
        HTTPException 409: Email already registered.
    """
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    referrer = _resolve_referrer(db, data.referral_code)
    user = User(
        id=uuid.uuid4(),
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        referral_code=generate_referral_code(),
        referred_by_id=referrer.id if referrer else None,
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _build_tokens(user)


def login_email(db: Session, data: LoginEmailRequest) -> TokenResponse:
    """Authenticate a user with email + password.

    Args:
        db: Database session.
        data: Login credentials.

    Returns:
        JWT token pair.

    Raises:
        HTTPException 401: Invalid email or password.
    """
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account deactivated",
        )
    return _build_tokens(user)


# ---------------------------------------------------------------------------
# Phone OTP signup / verify
# ---------------------------------------------------------------------------


def signup_phone(db: Session, data: SignupPhoneRequest) -> dict:
    """Start phone registration: create user (unverified) and send OTP.

    Args:
        db: Database session.
        data: Phone signup payload.

    Returns:
        Dict with ``otp_token`` (used in verify step).

    Raises:
        HTTPException 409: Phone already registered.
    """
    existing = db.query(User).filter(User.phone == data.phone).first()
    if existing and existing.is_verified:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number already registered",
        )

    referrer = _resolve_referrer(db, data.referral_code)

    if not existing:
        user = User(
            id=uuid.uuid4(),
            phone=data.phone,
            full_name=data.full_name,
            referral_code=generate_referral_code(),
            referred_by_id=referrer.id if referrer else None,
            is_verified=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user = existing

    otp = generate_otp()
    otp_token = str(uuid.uuid4())

    r = _get_redis()
    # Store OTP keyed by token for verification
    r.setex(
        f"otp:{otp_token}",
        _OTP_TOKEN_TTL_SECONDS,
        json.dumps({"otp": otp, "phone": data.phone, "user_id": str(user.id)}),
    )

    # In production, send via Twilio — imported lazily to avoid startup errors
    try:
        from app.services.notification_service import send_sms  # noqa: PLC0415

        send_sms(data.phone, f"Your Ride & Chill OTP is: {otp}")
    except Exception:
        pass  # Log in production; don't fail registration

    return {"otp_token": otp_token, "message": "OTP sent successfully"}


def verify_otp(db: Session, data: VerifyOTPRequest) -> TokenResponse:
    """Verify the OTP sent to a phone and return tokens.

    Args:
        db: Database session.
        data: OTP verification payload.

    Returns:
        JWT token pair.

    Raises:
        HTTPException 400: OTP expired or invalid.
    """
    r = _get_redis()
    raw = r.get(f"otp:{data.otp_token}")
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP expired or invalid token",
        )

    stored = json.loads(raw)
    if stored["otp"] != data.otp or stored["phone"] != data.phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect OTP",
        )

    r.delete(f"otp:{data.otp_token}")

    user = db.query(User).filter(User.id == stored["user_id"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    user.is_verified = True
    db.commit()
    db.refresh(user)
    return _build_tokens(user)


# ---------------------------------------------------------------------------
# Google OAuth
# ---------------------------------------------------------------------------


def login_google(db: Session, id_token: str) -> TokenResponse:
    """Authenticate or register a user via Google id_token.

    Args:
        db: Database session.
        id_token: Raw Google OAuth ID token from the client.

    Returns:
        JWT token pair.

    Raises:
        HTTPException 401: Token verification failed.
    """
    try:
        from google.oauth2 import id_token as google_id_token  # noqa: PLC0415
        from google.auth.transport import requests as google_requests  # noqa: PLC0415

        idinfo = google_id_token.verify_oauth2_token(
            id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google token verification failed: {exc}",
        )

    google_user_id: str = idinfo["sub"]
    email: str = idinfo.get("email", "")
    full_name: str = idinfo.get("name", "")
    picture: str = idinfo.get("picture", "")

    # Find by google_id first, then by email
    user = db.query(User).filter(User.google_id == google_user_id).first()
    if not user and email:
        user = db.query(User).filter(User.email == email).first()

    if user:
        if not user.google_id:
            user.google_id = google_user_id
        if not user.profile_photo_url and picture:
            user.profile_photo_url = picture
        db.commit()
        db.refresh(user)
    else:
        user = User(
            id=uuid.uuid4(),
            email=email or None,
            google_id=google_user_id,
            full_name=full_name,
            profile_photo_url=picture or None,
            referral_code=generate_referral_code(),
            is_verified=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return _build_tokens(user)


# ---------------------------------------------------------------------------
# Token refresh / logout
# ---------------------------------------------------------------------------


def refresh_tokens(db: Session, refresh_token: str) -> TokenResponse:
    """Issue a new access + refresh token pair, invalidating the old refresh token.

    Args:
        db: Database session.
        refresh_token: Valid (non-blacklisted) refresh JWT.

    Returns:
        New JWT token pair.

    Raises:
        HTTPException 401: Token invalid, expired, or blacklisted.
    """
    r = _get_redis()
    if r.get(f"blacklist:{refresh_token}"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked",
        )

    payload = verify_token(refresh_token, token_type="refresh")
    user_id: str = payload["sub"]

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated",
        )

    # Blacklist the used refresh token
    ttl = payload.get("exp", 0) - int(__import__("time").time())
    if ttl > 0:
        r.setex(f"blacklist:{refresh_token}", ttl, "1")

    return _build_tokens(user)


def logout(access_token: str, refresh_token: str | None = None) -> None:
    """Blacklist the access token (and optionally the refresh token) in Redis.

    Args:
        access_token: The currently valid access JWT to revoke.
        refresh_token: Optional refresh JWT to also revoke.
    """
    r = _get_redis()

    try:
        payload = verify_token(access_token, token_type="access")
        ttl = payload.get("exp", 0) - int(__import__("time").time())
        if ttl > 0:
            r.setex(f"blacklist:{access_token}", ttl, "1")
    except Exception:
        pass

    if refresh_token:
        try:
            payload = verify_token(refresh_token, token_type="refresh")
            ttl = payload.get("exp", 0) - int(__import__("time").time())
            if ttl > 0:
                r.setex(f"blacklist:{refresh_token}", ttl, "1")
        except Exception:
            pass
