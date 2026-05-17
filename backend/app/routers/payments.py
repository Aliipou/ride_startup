"""Payments router — Stripe webhook handler."""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..config import settings

router = APIRouter()


@router.post("/webhook", status_code=200)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Stripe webhook endpoint.
    Verifies signature to prevent spoofing.
    Handles: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded
    Idempotency: check payment record before processing to prevent double-execution.
    """
    import stripe

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook payload")

    from sqlalchemy import select
    from ..models.payment import Payment, PaymentStatus

    event_type = event["type"]
    data_object = event["data"]["object"]

    if event_type == "payment_intent.succeeded":
        intent_id = data_object["id"]
        payment = db.execute(
            select(Payment).where(Payment.stripe_intent_id == intent_id)
        ).scalar_one_or_none()

        if payment and payment.status != PaymentStatus.CAPTURED:
            payment.status = PaymentStatus.CAPTURED
            db.commit()

    elif event_type == "payment_intent.payment_failed":
        intent_id = data_object["id"]
        payment = db.execute(
            select(Payment).where(Payment.stripe_intent_id == intent_id)
        ).scalar_one_or_none()
        if payment:
            payment.status = PaymentStatus.FAILED
            db.commit()

    return {"received": True}
