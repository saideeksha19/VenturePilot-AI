import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.base import Base
from app.models.business import Business
from app.models.user import User


def _connectable_engine():
    engine = create_engine(
        settings.database_url,
        pool_pre_ping=True,
        connect_args={"connect_timeout": 3},
    )
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        pytest.skip(
            f"PostgreSQL is not reachable at {settings.database_url!r} ({exc}). "
            "Start it with `docker compose up -d db` or set DATABASE_URL to "
            "run database tests."
        )
    return engine


@pytest.fixture()
def db_session() -> Session:
    """Session bound to a transaction that is rolled back after each test."""
    engine = _connectable_engine()
    connection = engine.connect()
    transaction = connection.begin()
    Base.metadata.create_all(connection)
    session = Session(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()
    engine.dispose()


def test_user_business_round_trip(db_session: Session) -> None:
    user = User(
        email="owner@example.com",
        full_name="Ada Lovelace",
        hashed_password="not-a-real-hash",
    )
    db_session.add(user)
    db_session.flush()

    business = Business(
        name="Analytical Engines",
        industry="Engineering",
        size="11-50",
        owner_id=user.id,
    )
    db_session.add(business)
    db_session.flush()

    fetched_user = db_session.get(User, user.id)
    assert fetched_user is not None
    assert fetched_user.email == "owner@example.com"
    assert len(fetched_user.businesses) == 1
    assert fetched_user.businesses[0].name == "Analytical Engines"

    fetched_business = db_session.get(Business, business.id)
    assert fetched_business is not None
    assert fetched_business.owner.email == "owner@example.com"
    assert fetched_business.created_at is not None
    assert fetched_business.updated_at is not None


def test_duplicate_email_rejected(db_session: Session) -> None:
    db_session.add(User(email="dup@example.com", hashed_password="x"))
    db_session.flush()

    with pytest.raises(IntegrityError):
        db_session.add(User(email="dup@example.com", hashed_password="x"))
        db_session.flush()


def test_business_requires_nonempty_name(db_session: Session) -> None:
    user = User(email="owner2@example.com", hashed_password="x")
    db_session.add(user)
    db_session.flush()

    with pytest.raises(IntegrityError):
        db_session.add(Business(name="", owner_id=user.id))
        db_session.flush()
