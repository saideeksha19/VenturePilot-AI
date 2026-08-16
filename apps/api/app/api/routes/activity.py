from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.activity import Activity
from app.schemas.activity import ActivityRead
from app.services.context import require_business

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("", response_model=list[ActivityRead])
def list_activity(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[Activity]:
    """Recent agent operations for the current business, newest first."""
    business = require_business(db)
    return list(
        db.scalars(
            select(Activity)
            .where(Activity.business_id == business.id)
            .order_by(Activity.created_at.desc())
            .limit(limit)
        )
    )
