from __future__ import annotations

from fastapi.testclient import TestClient

from tests.test_app_auth import _login_via_email_code
from app.core.db.session import init_db
from app.main import app


def test_app_support_submit_success(monkeypatch) -> None:
    init_db()
    with TestClient(app) as client:
        payload = _login_via_email_code(client, monkeypatch, "support-user@example.com")
        access_token = payload["tokens"]["access_token"]

        monkeypatch.setattr("app.api.v1.app.TelegramSender.send_admin_alert", lambda self, *, text: True)

        response = client.post(
            "/api/app/support",
            json={"text": "Нужна помощь с доступом"},
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 200
        assert response.json() == {"ok": True}


def test_app_support_submit_rejects_empty_text(monkeypatch) -> None:
    init_db()
    with TestClient(app) as client:
        payload = _login_via_email_code(client, monkeypatch, "support-empty@example.com")
        access_token = payload["tokens"]["access_token"]

        response = client.post(
            "/api/app/support",
            json={"text": "   "},
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 400


def test_app_support_submit_requires_auth() -> None:
    init_db()
    with TestClient(app) as client:
        response = client.post("/api/app/support", json={"text": "Помогите"})

        assert response.status_code == 401


def test_app_support_submit_handles_unavailable_channel(monkeypatch) -> None:
    init_db()
    with TestClient(app) as client:
        payload = _login_via_email_code(client, monkeypatch, "support-fail@example.com")
        access_token = payload["tokens"]["access_token"]

        monkeypatch.setattr("app.api.v1.app.TelegramSender.send_admin_alert", lambda self, *, text: False)

        response = client.post(
            "/api/app/support",
            json={"text": "Поддержка недоступна?"},
            headers={"Authorization": f"Bearer {access_token}"},
        )

        assert response.status_code == 503
        assert response.json()["detail"] == "support_unavailable"
