"""Auth router — signup, login, OTP, OAuth, token refresh, logout."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.auth import (
    SignupEmailRequest,
    SignupPhoneRequest,
    VerifyOTPRequest,
    LoginEmailRequest,
    LoginGoogleRequest,
    TokenResponse,
    RefreshRequest,
    OTPInitResponse,
)
from ..services import auth_service

router = APIRouter()


@router.post("/signup/email", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup_email(data: SignupEmailRequest, db: Session = Depends(get_db)):
    """Register a new user with email and password."""
    return auth_service.signup_email(db, data)


@router.post("/signup/phone", response_model=OTPInitResponse, status_code=status.HTTP_200_OK)
def signup_phone(data: SignupPhoneRequest, db: Session = Depends(get_db)):
    """Start phone registration — sends OTP via SMS.
    NOTE: Rate-limit this endpoint in production (max 3 OTPs per phone per 10 min).
    """
    return auth_service.signup_phone(db, data)


@router.post("/verify/phone", response_model=TokenResponse)
def verify_otp(data: VerifyOTPRequest, db: Session = Depends(get_db)):
    """Verify the OTP received via SMS and complete registration/login."""
    return auth_service.verify_otp(db, data)


@router.post("/login/email", response_model=TokenResponse)
def login_email(data: LoginEmailRequest, db: Session = Depends(get_db)):
    """Login with email and password."""
    return auth_service.login_email(db, data)


@router.post("/login/google", response_model=TokenResponse)
def login_google(data: LoginGoogleRequest, db: Session = Depends(get_db)):
    """Login or register with Google ID token."""
    return auth_service.login_google(db, data)


@router.post("/refresh", response_model=TokenResponse)
def refresh_tokens(data: RefreshRequest, db: Session = Depends(get_db)):
    """Exchange a refresh token for a new access + refresh token pair."""
    return auth_service.refresh_tokens(db, data.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(data: RefreshRequest):
    """Blacklist the refresh token (logout)."""
    auth_service.logout(data.refresh_token)
