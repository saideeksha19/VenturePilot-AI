import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.agent_task import AgentTask
    from app.models.business import Business
    from app.models.goal import Goal


class Activity(TimestampMixin, Base):
    """An operation record: what an agent did, when, and why."""

    __tablename__ = "activities"
    __table_args__ = (Index("ix_activities_business_created", "business_id", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False
    )
    goal_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("goals.id", ondelete="SET NULL"), index=True
    )
    task_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("agent_tasks.id", ondelete="SET NULL")
    )
    agent_id: Mapped[str] = mapped_column(String(20), nullable=False)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="completed", nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)

    business: Mapped["Business"] = relationship(back_populates="activities")
    goal: Mapped["Goal | None"] = relationship(back_populates="activities")
    task: Mapped["AgentTask | None"] = relationship(back_populates="activities")
