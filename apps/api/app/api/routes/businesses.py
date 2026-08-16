from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.business import Business
from app.schemas.business import BusinessCreate, BusinessRead, BusinessUpdate
from app.services.owner import ensure_owner

router = APIRouter(prefix="/businesses", tags=["businesses"])


def _get_or_404(db: Session, business_id: UUID) -> Business:
    business = db.get(Business, business_id)
    if business is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business not found",
        )
    return business


@router.post("", response_model=BusinessRead, status_code=status.HTTP_201_CREATED)
def create_business(payload: BusinessCreate, db: Session = Depends(get_db)) -> Business:
    """Create a business owned by the current (placeholder) platform owner."""
    owner = ensure_owner(db)
    business = Business(owner_id=owner.id, **payload.model_dump())
    db.add(business)
    db.commit()
    db.refresh(business)
    return business


@router.get("", response_model=list[BusinessRead])
def list_businesses(db: Session = Depends(get_db)) -> list[Business]:
    """List businesses, newest first. The frontend uses this to find 'the' business."""
    owner = ensure_owner(db)
    return list(
        db.scalars(
            select(Business)
            .where(Business.owner_id == owner.id)
            .order_by(Business.created_at.desc())
        )
    )


@router.get("/{business_id}", response_model=BusinessRead)
def get_business(business_id: UUID, db: Session = Depends(get_db)) -> Business:
    return _get_or_404(db, business_id)


@router.put("/{business_id}", response_model=BusinessRead)
def update_business(
    business_id: UUID,
    payload: BusinessUpdate,
    db: Session = Depends(get_db),
) -> Business:
    """Update a business. Only provided fields are applied."""
    business = _get_or_404(db, business_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(business, field, value)
    db.commit()
    db.refresh(business)
    return business
