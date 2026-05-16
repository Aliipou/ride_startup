"""Promos router."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..schemas.promo import PromoValidateRequest, PromoValidateResponse
from ..services import promo_service
from ..utils.deps import get_current_user

router = APIRouter()


@router.post("/validate", response_model=PromoValidateResponse)
def validate_promo(
    data: PromoValidateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return promo_service.validate_promo(db, data.code, current_user.id, data.ride_price)


@router.get("/mine")
def my_promos(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from sqlalchemy import select
    from ..models.promo import PromoCode
    from datetime import datetime, timezone

    now = datetime.now(tz=timezone.utc)
    codes = db.execute(
        select(PromoCode).where(
            PromoCode.is_active == True,
            PromoCode.valid_until >= now,
        )
    ).scalars().all()
    return codes
