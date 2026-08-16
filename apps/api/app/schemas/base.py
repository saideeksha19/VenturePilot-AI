"""Shared schema base for API responses.

SQLite (the dev database) stores datetimes without timezone info, so raw ORM
values serialize as naive ISO strings (e.g. "2026-08-16T08:19:35.324145") and
browsers parse them as LOCAL time — making relative timestamps wrong. Every
read schema that exposes datetimes inherits `APIModel`, which attaches UTC to
naive values so the wire format is always offset-aware ISO-8601.
"""

from datetime import datetime, timezone

from pydantic import BaseModel, field_validator


class APIModel(BaseModel):
    """Base for read schemas: naive datetimes are treated as UTC."""

    @field_validator("*", mode="before")
    @classmethod
    def _attach_utc(cls, value: object) -> object:
        if isinstance(value, datetime) and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
