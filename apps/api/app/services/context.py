"""Route-level context resolution.

Until authentication lands, routes operate on the platform owner's most
recent business (the one created during onboarding).
"""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.business import Business
from app.services.owner import ensure_owner


def current_business(db: Session) -> Business | None:
    """The platform owner's most recently created business, or None."""
    owner = ensure_owner(db)
    return db.scalar(
        select(Business).where(Business.owner_id == owner.id).order_by(Business.created_at.desc())
    )


def require_business(db: Session) -> Business:
    """Like current_business but raises 404 when onboarding hasn't run."""
    business = current_business(db)
    if business is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No business found. Complete onboarding first.",
        )
    return business
