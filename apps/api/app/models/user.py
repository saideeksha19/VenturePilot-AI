import uuid
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.business import Business


class User(TimestampMixin, Base):
    """A user of the VenturePilot platform."""

    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("length(email) > 0", name="email_not_empty"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255))
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    businesses: Mapped[list["Business"]] = relationship(back_populates="owner")
