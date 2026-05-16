"""Wallet router — balance, top-up, transactions."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..schemas.wallet import WalletResponse, TopupRequest, TopupResponse, TransactionResponse
from ..services import wallet_service, payment_service
from ..utils.deps import get_current_user

router = APIRouter()


@router.get("", response_model=WalletResponse)
def get_wallet(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wallet = wallet_service.get_or_create_wallet(db, current_user.id)
    return wallet


@router.get("/transactions", response_model=list[TransactionResponse])
def get_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from sqlalchemy import select, desc
    from ..models.wallet import Wallet, WalletTransaction

    wallet = wallet_service.get_or_create_wallet(db, current_user.id)
    txns = db.execute(
        select(WalletTransaction)
        .where(WalletTransaction.wallet_id == wallet.id)
        .order_by(desc(WalletTransaction.created_at))
        .offset(skip)
        .limit(limit)
    ).scalars().all()
    return txns


@router.post("/topup", response_model=TopupResponse)
def topup(
    data: TopupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a Stripe PaymentIntent for wallet top-up."""
    intent = payment_service.create_payment_intent(
        amount_eur=data.amount,
        metadata={"user_id": str(current_user.id), "type": "wallet_topup"},
    )
    return TopupResponse(
        client_secret=intent["client_secret"],
        intent_id=intent["id"],
        amount=data.amount,
    )


@router.get("/topup/{intent_id}", response_model=WalletResponse)
def confirm_topup(
    intent_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Poll after Stripe confirms payment — credits wallet and returns updated balance."""
    import stripe
    from ..config import settings
    stripe.api_key = settings.STRIPE_SECRET_KEY

    intent = stripe.PaymentIntent.retrieve(intent_id)
    if intent.status == "succeeded":
        amount = intent.amount / 100  # cents → euros
        wallet_service.topup(db, current_user.id, intent_id, amount)

    return wallet_service.get_or_create_wallet(db, current_user.id)
