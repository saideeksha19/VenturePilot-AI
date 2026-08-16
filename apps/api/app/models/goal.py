import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, CheckConstraint, DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.activity import Activity
    from app.models.agent_task import AgentTask
    from app.models.business import Business


class Goal(TimestampMixin, Base):
    """A founder's objective, planned and executed by the agent team."""

    __tablename__ = "goals"
    __table_args__ = (
        CheckConstraint("length(objective) > 0", name="objective_not_empty"),
        CheckConstraint("progress >= 0 AND progress <= 100", name="progress_range"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("businesses.id", ondelete="CASCADE"), index=True, nullable=False
    )
    objective: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="created", nullable=False)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    priority: Mapped[str | None] = mapped_column(String(20))
    success_criteria: Mapped[list | None] = mapped_column(JSON)
    plan_summary: Mapped[str | None] = mapped_column(Text)
    simulated: Mapped[bool] = mapped_column(default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    business: Mapped["Business"] = relationship(back_populates="goal_records")
    tasks: Mapped[list["AgentTask"]] = relationship(
        back_populates="goal", cascade="all, delete-orphan", order_by="AgentTask.order_index"
    )
    activities: Mapped[list["Activity"]] = relationship(back_populates="goal")
