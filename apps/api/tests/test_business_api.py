"""Business API tests.

These run against an in-memory SQLite database and therefore work on any
machine without PostgreSQL. The live-PostgreSQL round-trip tests live in
test_db.py and skip when no database is reachable.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app

VALID_BODY = {
    "name": "Northwind Labs",
    "industry": "B2B SaaS",
    "size": "11-50",
    "description": "AI-native operations for B2B founders.",
    "goals": "Generate 50 qualified B2B opportunities this quarter.",
}


@pytest.fixture()
def client() -> TestClient:
    """TestClient whose DB dependency is a fresh in-memory SQLite database."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)

    def override_get_db():
        db = Session(bind=engine)
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    engine.dispose()


def test_create_business(client: TestClient) -> None:
    response = client.post("/api/businesses", json=VALID_BODY)

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Northwind Labs"
    assert body["industry"] == "B2B SaaS"
    assert body["size"] == "11-50"
    assert body["description"] == VALID_BODY["description"]
    assert body["goals"] == VALID_BODY["goals"]
    assert body["id"]
    assert body["owner_id"]
    assert body["created_at"]
    assert body["updated_at"]


def test_get_business(client: TestClient) -> None:
    created = client.post("/api/businesses", json=VALID_BODY).json()

    response = client.get(f"/api/businesses/{created['id']}")

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Northwind Labs"
    assert body["id"] == created["id"]


def test_update_business(client: TestClient) -> None:
    created = client.post("/api/businesses", json=VALID_BODY).json()

    response = client.put(
        f"/api/businesses/{created['id']}",
        json={"name": "Northwind Labs 2", "goals": "Reach 20 demos this quarter."},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Northwind Labs 2"
    assert body["goals"] == "Reach 20 demos this quarter."
    # Unprovided fields are untouched.
    assert body["industry"] == "B2B SaaS"
    assert body["description"] == VALID_BODY["description"]


def test_create_requires_name(client: TestClient) -> None:
    response = client.post("/api/businesses", json={**VALID_BODY, "name": ""})

    assert response.status_code == 422


def test_create_rejects_unknown_fields(client: TestClient) -> None:
    response = client.post("/api/businesses", json={**VALID_BODY, "hacked": True})

    assert response.status_code == 422


def test_get_missing_business_returns_404(client: TestClient) -> None:
    import uuid

    response = client.get(f"/api/businesses/{uuid.uuid4()}")

    assert response.status_code == 404


def test_update_missing_business_returns_404(client: TestClient) -> None:
    import uuid

    response = client.put(f"/api/businesses/{uuid.uuid4()}", json={"name": "X"})

    assert response.status_code == 404


def test_business_is_persisted(client: TestClient) -> None:
    created = client.post("/api/businesses", json=VALID_BODY).json()

    # A fresh request hits a fresh session on the same database.
    listed = client.get("/api/businesses").json()
    assert len(listed) == 1
    assert listed[0]["id"] == created["id"]
    assert listed[0]["name"] == "Northwind Labs"

    fetched = client.get(f"/api/businesses/{created['id']}").json()
    assert fetched["goals"] == VALID_BODY["goals"]
