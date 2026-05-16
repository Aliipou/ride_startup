"""Users router — profile, saved places."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..schemas.user import UserResponse, UpdateProfileRequest
from ..utils.deps import get_current_user

router = APIRouter()


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_me(
    data: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.full_name is not None:
        current_user.full_name = data.full_name
    if data.profile_photo_url is not None:
        current_user.profile_photo_url = data.profile_photo_url
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/saved-places")
def get_saved_places(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from sqlalchemy import select
    from ..models.saved_place import SavedPlace

    places = db.execute(
        select(SavedPlace).where(SavedPlace.user_id == current_user.id)
    ).scalars().all()
    return places


@router.post("/saved-places", status_code=201)
def add_saved_place(
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from ..models.saved_place import SavedPlace

    place = SavedPlace(user_id=current_user.id, **data)
    db.add(place)
    db.commit()
    db.refresh(place)
    return place


@router.delete("/saved-places/{place_id}", status_code=204)
def delete_saved_place(
    place_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    import uuid
    from sqlalchemy import select
    from ..models.saved_place import SavedPlace

    place = db.execute(
        select(SavedPlace).where(
            SavedPlace.id == uuid.UUID(place_id),
            SavedPlace.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if not place:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(place)
    db.commit()
