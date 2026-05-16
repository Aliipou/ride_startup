"""Unit + integration tests for wallet service.

Tests verify atomicity: partial failures must not corrupt balance.
"""

import pytest
from app.services.wallet_service import get_or_create_wallet, get_balance, deduct, credit, topup
from tests.conftest import make_user


class TestWalletCreation:
    def test_creates_wallet_on_first_access(self, db):
        user = make_user(db, email="newuser@test.com")
        # wallet is already created by make_user (balance=50)
        wallet = get_or_create_wallet(db, user.id)
        assert wallet is not None
        assert wallet.user_id == user.id

    def test_get_or_create_idempotent(self, db):
        user = make_user(db, email="idem@test.com")
        w1 = get_or_create_wallet(db, user.id)
        w2 = get_or_create_wallet(db, user.id)
        assert w1.id == w2.id


class TestBalance:
    def test_initial_balance_from_fixture(self, db):
        user = make_user(db, email="bal@test.com")
        balance = get_balance(db, user.id)
        assert balance == 50.0


class TestDeduct:
    def test_deduct_reduces_balance(self, db):
        user = make_user(db, email="deduct@test.com")
        txn = deduct(db, user.id, 10.0, "Test deduction")
        assert get_balance(db, user.id) == 40.0
        assert txn.amount == -10.0

    def test_deduct_insufficient_funds_raises(self, db):
        user = make_user(db, email="broke@test.com")
        with pytest.raises(ValueError, match="Insufficient"):
            deduct(db, user.id, 100.0, "Too much")

    def test_deduct_exact_balance_succeeds(self, db):
        user = make_user(db, email="exact@test.com")
        deduct(db, user.id, 50.0, "Exact")
        assert get_balance(db, user.id) == 0.0

    def test_failed_deduct_does_not_change_balance(self, db):
        user = make_user(db, email="safe@test.com")
        try:
            deduct(db, user.id, 999.0, "Will fail")
        except ValueError:
            pass
        assert get_balance(db, user.id) == 50.0  # unchanged


class TestCredit:
    def test_credit_increases_balance(self, db):
        user = make_user(db, email="credit@test.com")
        credit(db, user.id, 25.0, "Refund")
        assert get_balance(db, user.id) == 75.0

    def test_credit_transaction_recorded(self, db):
        user = make_user(db, email="txn@test.com")
        txn = credit(db, user.id, 10.0, "Bonus")
        assert txn.amount == 10.0
        assert txn.description == "Bonus"


class TestTopup:
    def test_topup_credits_wallet(self, db):
        user = make_user(db, email="topup@test.com")
        topup(db, user.id, "pi_test_123", 20.0)
        assert get_balance(db, user.id) == 70.0
