from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.base import APIModel


class GoalCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    objective: str = Field(min_length=1, max_length=500)


class TaskRead(APIModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    goal_id: UUID
    agent_id: str
    order_index: int
    title: str
    task: str
    purpose: str | None = None
    depends_on: list | None = None
    expected_output: str | None = None
    status: str
    progress: int
    started_at: datetime | None = None
    completed_at: datetime | None = None
    output: str | None = None
    result: dict | None = None
    error: str | None = None


class GoalRead(APIModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    objective: str
    status: str
    progress: int
    priority: str | None = None
    success_criteria: list | None = None
    plan_summary: str | None = None
    simulated: bool = False
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    tasks: list[TaskRead] = Field(default_factory=list)
