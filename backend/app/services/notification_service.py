"""Notification service — push (Firebase FCM), SMS (Twilio), and DB records."""

import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.models.notification import Notification


def send_push(
    user_push_token: str,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> bool:
    """Send a push notification via Firebase Cloud Messaging.

    Args:
        user_push_token: FCM device registration token.
        title: Notification title.
        body: Notification body text.
        data: Optional extra key-value payload.

    Returns:
        True on success, False if Firebase is not configured or an error occurs.
    """
    if not user_push_token:
        return False

    try:
        import firebase_admin.messaging as fcm  # noqa: PLC0415

        message = fcm.Message(
            notification=fcm.Notification(title=title, body=body),
            data={str(k): str(v) for k, v in (data or {}).items()},
            token=user_push_token,
        )
        fcm.send(message)
        return True
    except Exception:
        # Log in production; never crash the caller
        return False


def send_sms(phone: str, message: str) -> bool:
    """Send an SMS via Twilio.

    Args:
        phone: E.164-formatted recipient phone number.
        message: SMS message body.

    Returns:
        True on success, False if Twilio is not configured or an error occurs.
    """
    try:
        from twilio.rest import Client  # noqa: PLC0415

        from app.config import settings  # noqa: PLC0415

        if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
            return False

        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(
            body=message,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=phone,
        )
        return True
    except Exception:
        return False


def save_notification(
    db: Session,
    user_id: uuid.UUID,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> Notification:
    """Persist an in-app notification record to the database.

    Args:
        db: Database session.
        user_id: Recipient user ID.
        title: Notification title.
        body: Notification body.
        data: Optional JSON metadata.

    Returns:
        Created Notification ORM instance.
    """
    notification = Notification(
        user_id=user_id,
        title=title,
        body=body,
        data=data,
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification
