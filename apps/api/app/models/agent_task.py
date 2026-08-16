import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, CheckConstraint, DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.activity import Activity
    from app.models.goal import Goal

#: Lifecycle states for an agent task. "unavailable" means no executor is
#: registered for this agent yet — the stage is NOT reported as completed.
TASK_STATUSES = ("queued", "running", "completed", "failed", "unavailable", "deferred")


class AgentTask(TimestampMixin, Base):
    """A single agent step inside a goal execution plan."""

    __tablename__ = "agent_tasks"
    __table_args__ = (
        CheckConstraint("progress >= 0 AND progress <= 100", name="progress_range"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    goal_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("goals.id", ondelete="CASCADE"), index=True, nullable=False
    )
    agent_id: Mapped[str] = mapped_column(String(20), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    task: Mapped[str] = mapped_column(Text, nullable=False)
    purpose: Mapped[str | None] = mapped_column(Text)
    depends_on: Mapped[list | None] = mapped_column(JSON)
    expected_output: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="queued", nullable=False)
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    output: Mapped[str | None] = mapped_column(Text)
    result_json: Mapped[dict | None] = mapped_column(JSON)
    error: Mapped[str | None] = mapped_column(Text)

    goal: Mapped["Goal"] = relationship(back_populates="tasks")
    activities: Mapped[list["Activity"]] = relationship(back_populates="task")

    @property
    def result(self) -> dict | None:
        """Expose result_json under a clean name in API responses."""
        return self.result_json
