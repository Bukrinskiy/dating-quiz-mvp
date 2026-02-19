from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.main import app


def test_redirect_unavailable() -> None:
    client = TestClient(app)

    response = client.get("/api/payment/redirect?clickid=test123", follow_redirects=False)

    assert response.status_code == 503
    assert response.json()["detail"] == "Payment system is not connected"


def test_redirect_empty_clickid() -> None:
    client = TestClient(app)

    response = client.get("/api/payment/redirect?clickid=", follow_redirects=False)

    assert response.status_code == 422


def test_redirect_invalid_after_sanitization() -> None:
    client = TestClient(app)

    response = client.get("/api/payment/redirect?clickid=!!!", follow_redirects=False)

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid clickid"
