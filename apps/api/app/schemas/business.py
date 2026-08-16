from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.base import APIModel


class BusinessBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=255)
    industry: str | None = Field(default=None, max_length=120)
    size: str | None = Field(default=None, max_length=40)
    description: str | None = None
    goals: str | None = None


class BusinessCreate(BusinessBase):
    pass


class BusinessUpdate(BaseModel):
    """Partial update — only fields that are provided are applied."""

    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=255)
    industry: str | None = Field(default=None, max_length=120)
    size: str | None = Field(default=None, max_length=40)
    description: str | None = None
    goals: str | None = None


class BusinessRead(APIModel, BusinessBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    owner_id: UUID
    created_at: datetime
    updated_at: datetime
