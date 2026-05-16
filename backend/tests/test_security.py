"""Unit tests for security utilities — Argon2 hashing + JWT."""

import pytest
import time
from datetime import timedelta

from app.utils.security import (
    get_password_hash,
    verify_password,
    needs_rehash,
    create_access_token,
    create_refresh_token,
    verify_token,
    generate_otp,
    generate_referral_code,
)
from fastapi import HTTPException


class TestArgon2Hashing:
    def test_hash_is_not_plaintext(self):
        hashed = get_password_hash("mysecretpassword")
        assert hashed != "mysecretpassword"
        assert "$argon2" in hashed  # Argon2id identifier

    def test_verify_correct_password(self):
        hashed = get_password_hash("correct_horse_battery")
        assert verify_password("correct_horse_battery", hashed) is True

    def test_verify_wrong_password(self):
        hashed = get_password_hash("correct")
        assert verify_password("wrong", hashed) is False

    def test_two_hashes_of_same_password_differ(self):
        """Argon2 uses random salt — same password must produce different hashes."""
        h1 = get_password_hash("password")
        h2 = get_password_hash("password")
        assert h1 != h2

    def test_both_hashes_verify_correctly(self):
        h1 = get_password_hash("password")
        h2 = get_password_hash("password")
        assert verify_password("password", h1)
        assert verify_password("password", h2)

    def test_needs_rehash_returns_false_for_fresh_hash(self):
        hashed = get_password_hash("test")
        assert needs_rehash(hashed) is False


class TestJWT:
    def test_access_token_verifies(self):
        token = create_access_token({"sub": "user-123"})
        payload = verify_token(token, "access")
        assert payload["sub"] == "user-123"

    def test_refresh_token_verifies(self):
        token = create_refresh_token({"sub": "user-456"})
        payload = verify_token(token, "refresh")
        assert payload["sub"] == "user-456"

    def test_access_token_rejects_as_refresh(self):
        token = create_access_token({"sub": "user-123"})
        with pytest.raises(HTTPException) as exc_info:
            verify_token(token, "refresh")
        assert exc_info.value.status_code == 401

    def test_expired_token_raises_401(self):
        token = create_access_token({"sub": "user"}, expires_delta=timedelta(seconds=-1))
        with pytest.raises(HTTPException) as exc_info:
            verify_token(token)
        assert exc_info.value.status_code == 401

    def test_garbage_token_raises_401(self):
        with pytest.raises(HTTPException) as exc_info:
            verify_token("not.a.jwt")
        assert exc_info.value.status_code == 401

    def test_tampered_token_raises_401(self):
        token = create_access_token({"sub": "user"})
        tampered = token[:-5] + "xxxxx"
        with pytest.raises(HTTPException):
            verify_token(tampered)


class TestOTP:
    def test_otp_is_6_digits(self):
        otp = generate_otp()
        assert len(otp) == 6
        assert otp.isdigit()

    def test_otps_are_random(self):
        otps = {generate_otp() for _ in range(20)}
        assert len(otps) > 10  # very likely to have diverse values


class TestReferralCode:
    def test_referral_code_is_8_chars(self):
        code = generate_referral_code()
        assert len(code) == 8

    def test_referral_code_is_alphanumeric_uppercase(self):
        code = generate_referral_code()
        assert code.isalnum()
        assert code == code.upper()

    def test_referral_codes_are_random(self):
        codes = {generate_referral_code() for _ in range(20)}
        assert len(codes) > 10
