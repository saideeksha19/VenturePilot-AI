"""Owner resolution for businesses.

VenturePilot does not have authentication yet (planned for a later milestone),
so businesses need an owner to satisfy the `owner_id` foreign key. This module
resolves a single deterministic "platform owner" user on first use.

Replace `ensure_owner` with the authenticated user once auth lands — the
business routes are the only consumers, so the swap is contained.
"""

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User

#: Fixed identity for the placeholder platform owner (no auth yet).
DEFAULT_OWNER_EMAIL = "owner@venturepilot.local"


def ensure_owner(db: Session) -> User:
    """Return the platform owner, creating it on first call (idempotent)."""
    existing = db.scalar(select(User).where(User.email == DEFAULT_OWNER_EMAIL))
    if existing is not None:
        return existing

    # Password is never used yet; a placeholder keeps the column honest.
    user = User(
        id=uuid.uuid4(),
        email=DEFAULT_OWNER_EMAIL,
        full_name="VenturePilot Owner",
        hashed_password="not-a-real-password",
    )
    db.add(user)
    db.flush()
    return user
