"""FastAPI dependency injections for authentication and authorization."""

from typing import Annotated

import redis as redis_lib
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.rider import ApprovalStatus, Rider
from app.models.user import User
from app.utils.security import verify_token
from app.config import settings

_bearer = HTTPBearer()

# ---------------------------------------------------------------------------
# Redis client (shared singleton — lazy init)
# ---------------------------------------------------------------------------

_redis_client: redis_lib.Redis | None = None


def get_redis() -> redis_lib.Redis:
    """Return (or lazily create) the global Redis client."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis_lib.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


# ---------------------------------------------------------------------------
# Auth dependencies
# ---------------------------------------------------------------------------


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Extract and validate the access token, then load the User from DB.

    Raises:
        HTTPException 401: Token invalid, blacklisted, or user not found.
        HTTPException 403: User account is deactivated.
    """
    token = credentials.credentials
    payload = verify_token(token, token_type="access")

    # Check blacklist
    redis = get_redis()
    if redis.get(f"blacklist:{token}"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
        )

    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )
    return user


def get_current_rider(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Rider:
    """Load the Rider profile for the authenticated user.

    Raises:
        HTTPException 404: No rider profile found for this user.
    """
    rider = db.query(Rider).filter(Rider.user_id == current_user.id).first()
    if rider is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rider profile not found",
        )
    return rider


def get_current_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Ensure the authenticated user has admin privileges.

    Raises:
        HTTPException 403: User is not an admin.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return current_user


def require_approved_rider(
    rider: Annotated[Rider, Depends(get_current_rider)],
) -> Rider:
    """Ensure the rider's account has been approved by admin.

    Raises:
        HTTPException 403: Rider is not yet approved or was rejected.
    """
    if rider.approval_status != ApprovalStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Rider account not approved (status: {rider.approval_status.value})",
        )
    return rider
