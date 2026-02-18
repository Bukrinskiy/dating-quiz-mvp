from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.main import app, build_signature


def test_redirect_success() -> None:
    client = TestClient(app)

    response = client.get("/api/payment/redirect?clickid=test123", follow_redirects=False)

    assert response.status_code == 302
    location = response.headers["location"]
    assert "m=YOUR_MERCHANT_ID" in location
    assert "oa=9.99" in location
    assert "currency=USD" in location
    assert "o=test123" in location


def test_redirect_empty_clickid() -> None:
    client = TestClient(app)

    response = client.get("/api/payment/redirect?clickid=", follow_redirects=False)

    assert response.status_code == 422


def test_redirect_invalid_after_sanitization() -> None:
    client = TestClient(app)

    response = client.get("/api/payment/redirect?clickid=!!!", follow_redirects=False)

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid clickid"


def test_signature_formula() -> None:
    signature = build_signature(
        merchant_id="merchant",
        amount="9.99",
        secret_1="secret",
        currency="USD",
        order_id="order1",
    )

    assert signature == "e1b4ecd585c3da012aadd75d91a19bc1"
