from fastapi.testclient import TestClient

from app.main import app


def test_health_check() -> None:
    response = TestClient(app).get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "venturepilot-api"
    # Reports connectivity without failing liveness when the DB is down.
    assert body["database"] in {"ok", "unreachable"}
