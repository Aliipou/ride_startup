"""Auth request/response schemas."""

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class SignupEmailRequest(BaseModel):
    """Register a new user with email and password."""

    model_config = ConfigDict(from_attributes=True)

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    referral_code: str | None = Field(default=None, max_length=8)


class SignupPhoneRequest(BaseModel):
    """Register a new user with a phone number — triggers OTP."""

    model_config = ConfigDict(from_attributes=True)

    phone: str = Field(pattern=r"^\+?[1-9]\d{6,14}$")
    full_name: str = Field(min_length=1, max_length=255)
    referral_code: str | None = Field(default=None, max_length=8)


class VerifyOTPRequest(BaseModel):
    """Verify OTP sent to phone; returns tokens on success."""

    model_config = ConfigDict(from_attributes=True)

    phone: str
    otp: str = Field(min_length=6, max_length=6)
    otp_token: str  # opaque token returned from signup/phone


class LoginEmailRequest(BaseModel):
    """Authenticate with email + password."""

    model_config = ConfigDict(from_attributes=True)

    email: EmailStr
    password: str


class LoginGoogleRequest(BaseModel):
    """Authenticate via Google OAuth id_token."""

    model_config = ConfigDict(from_attributes=True)

    id_token: str


class TokenResponse(BaseModel):
    """JWT access + refresh tokens returned after successful auth."""

    model_config = ConfigDict(from_attributes=True)

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshRequest(BaseModel):
    """Request a new access token using a valid refresh token."""

    model_config = ConfigDict(from_attributes=True)

    refresh_token: str


class OTPResponse(BaseModel):
    """Opaque token required to verify the OTP."""

    model_config = ConfigDict(from_attributes=True)

    otp_token: str
    message: str = "OTP sent successfully"
