from datetime import datetime
from uuid import UUID

from pydantic import ConfigDict

from app.schemas.base import APIModel


class ActivityRead(APIModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    agent_id: str
    action: str
    status: str
    summary: str | None = None
    goal_id: UUID | None = None
    created_at: datetime
