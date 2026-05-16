"""Stripe payment service — PaymentIntents, captures, refunds, Connect payouts."""

from typing import Any

import stripe

from app.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY


def _euros_to_cents(amount_eur: float) -> int:
    """Convert a EUR float to the integer cent value Stripe expects."""
    return round(amount_eur * 100)


def create_payment_intent(
    amount_eur: float,
    metadata: dict[str, str] | None = None,
    capture_method: str = "automatic",
) -> Any:
    """Create a Stripe PaymentIntent for a ride or wallet top-up.

    Args:
        amount_eur: Amount to charge in EUR.
        metadata: Optional key-value metadata attached to the intent.
        capture_method: ``"automatic"`` or ``"manual"`` (for two-step auth).

    Returns:
        Stripe PaymentIntent object.

    Raises:
        stripe.error.StripeError: On any Stripe API failure.
    """
    intent = stripe.PaymentIntent.create(
        amount=_euros_to_cents(amount_eur),
        currency="eur",
        metadata=metadata or {},
        capture_method=capture_method,
    )
    return intent


def capture_payment_intent(intent_id: str, amount_eur: float | None = None) -> Any:
    """Capture a previously authorised PaymentIntent.

    Args:
        intent_id: Stripe PaymentIntent ID (``pi_...``).
        amount_eur: Optional partial capture amount in EUR; full capture if ``None``.

    Returns:
        Updated Stripe PaymentIntent object.
    """
    kwargs: dict[str, Any] = {}
    if amount_eur is not None:
        kwargs["amount_to_capture"] = _euros_to_cents(amount_eur)

    return stripe.PaymentIntent.capture(intent_id, **kwargs)


def cancel_payment_intent(intent_id: str) -> Any:
    """Cancel an uncaptured PaymentIntent.

    Args:
        intent_id: Stripe PaymentIntent ID.

    Returns:
        Cancelled Stripe PaymentIntent object.
    """
    return stripe.PaymentIntent.cancel(intent_id)


def create_refund(intent_id: str, amount_eur: float | None = None) -> Any:
    """Refund a captured PaymentIntent, partially or fully.

    Args:
        intent_id: Stripe PaymentIntent ID that was captured.
        amount_eur: Amount to refund in EUR; full refund if ``None``.

    Returns:
        Stripe Refund object.
    """
    kwargs: dict[str, Any] = {"payment_intent": intent_id}
    if amount_eur is not None:
        kwargs["amount"] = _euros_to_cents(amount_eur)

    return stripe.Refund.create(**kwargs)


def create_connect_account(rider_email: str) -> Any:
    """Create a Stripe Express Connect account for a rider to receive payouts.

    Args:
        rider_email: Rider's email address.

    Returns:
        Stripe Account object with ``id`` field.
    """
    account = stripe.Account.create(
        type="express",
        country="FI",
        email=rider_email,
        capabilities={
            "card_payments": {"requested": True},
            "transfers": {"requested": True},
        },
    )
    return account


def create_payout(stripe_account_id: str, amount_eur: float) -> Any:
    """Transfer earnings to a rider's connected Stripe account.

    Args:
        stripe_account_id: The rider's Stripe Connect account ID (``acct_...``).
        amount_eur: Amount to transfer in EUR.

    Returns:
        Stripe Transfer object.
    """
    transfer = stripe.Transfer.create(
        amount=_euros_to_cents(amount_eur),
        currency="eur",
        destination=stripe_account_id,
    )
    return transfer


def construct_webhook_event(payload: bytes, sig_header: str) -> Any:
    """Verify and construct a Stripe webhook event.

    Args:
        payload: Raw request body bytes.
        sig_header: Value of the ``Stripe-Signature`` header.

    Returns:
        Verified Stripe Event object.

    Raises:
        stripe.error.SignatureVerificationError: If the signature is invalid.
    """
    return stripe.Webhook.construct_event(
        payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
    )
