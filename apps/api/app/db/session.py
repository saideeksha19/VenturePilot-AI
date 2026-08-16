import sqlite3
from collections.abc import Iterator
from datetime import datetime, timezone

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

# The engine connects lazily on first use. The connect timeout keeps
# requests from hanging indefinitely when the database is unreachable.
# `connect_timeout` is psycopg-specific, so it only applies to postgres URLs
# (SQLite is accepted for local development without a database server).
_connect_args = (
    {"connect_timeout": 3}
    if settings.database_url.startswith("postgresql")
    else {}
)
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    connect_args=_connect_args,
)

# Local-dev convenience: SQLite has no now() function, but the models use the
# DB clock (server_default / onupdate = func.now()) which is correct for
# PostgreSQL. Register a matching now() on SQLite connections so a
# `DATABASE_URL=sqlite:///...` dev database works without a DB server.
# PostgreSQL production runs are unaffected.
if settings.database_url.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def _register_sqlite_now(dbapi_connection, _connection_record) -> None:  # type: ignore[no-untyped-def]
        if isinstance(dbapi_connection, sqlite3.Connection):
            dbapi_connection.create_function(
                "now",
                0,
                lambda: datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S.%f"),
            )

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_db() -> Iterator[Session]:
    """FastAPI dependency that yields a database session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
