import uuid
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.activity import Activity
    from app.models.goal import Goal
    from app.models.user import User


class Business(TimestampMixin, Base):
    """A small business operated through VenturePilot."""

    __tablename__ = "businesses"
    __table_args__ = (
        CheckConstraint("length(name) > 0", name="name_not_empty"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    industry: Mapped[str | None] = mapped_column(String(120))
    size: Mapped[str | None] = mapped_column(String(40))
    description: Mapped[str | None] = mapped_column(Text)
    goals: Mapped[str | None] = mapped_column(Text)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    owner: Mapped["User"] = relationship(back_populates="businesses")
    # NOTE: the `goals` Text column above holds the business's own stated goals.
    # The persisted Goal records for this business live on the `goal_records`
    # relationship (renamed to avoid colliding with the column).
    goal_records: Mapped[list["Goal"]] = relationship(back_populates="business")
    activities: Mapped[list["Activity"]] = relationship(back_populates="business")
