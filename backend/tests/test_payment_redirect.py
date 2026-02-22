from __future__ import annotations

import os
from pathlib import Path
import sys

from fastapi.testclient import TestClient

TEST_DB_PATH = Path(__file__).resolve().parent / "test_app.db"
if TEST_DB_PATH.exists():
    TEST_DB_PATH.unlink()

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["STRIPE_SECRET_KEY"] = "sk_test_dummy"
os.environ["STRIPE_WEBHOOK_SECRET"] = "whsec_dummy"
os.environ["ACCESS_TOKEN_SECRET"] = "test-secret"
os.environ["TELEGRAM_BOT_USERNAME"] = "test_bot"
os.environ["EMAIL_DELIVERY_MODE"] = "log_only"
os.environ["LOG_OTP_IN_NONPROD"] = "true"
os.environ["BOT_INTERNAL_TOKEN"] = "test-internal-token"
os.environ["META_PIXEL_ID"] = "1052620673116886"
os.environ["META_ACCESS_TOKEN"] = "test-meta-token"
os.environ["META_GRAPH_API_VERSION"] = "v18.0"

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.main import app
from app.core.config import get_settings


def test_legacy_redirect_endpoint_gone() -> None:
    with TestClient(app) as client:
        response = client.get("/api/payment/redirect", follow_redirects=False)

        assert response.status_code == 410
        assert "checkout-session" in response.json()["detail"]


def test_checkout_session_one_time(monkeypatch) -> None:
    class DummySession:
        id = "cs_test_1"
        url = "https://checkout.test/1"

    monkeypatch.setattr("stripe.checkout.Session.create", lambda **_: DummySession())

    with TestClient(app) as client:
        response = client.post(
            "/api/payment/checkout-session",
            json={
                "mode": "one_time",
                "plan": "one_time_basic",
                "email": "user@example.com",
                "clickid": "abc-123",
                "locale": "en",
            },
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["session_id"] == "cs_test_1"
        assert payload["checkout_url"] == "https://checkout.test/1"
        assert payload["order_id"]


def test_checkout_session_subscription(monkeypatch) -> None:
    class DummySession:
        id = "cs_test_2"
        url = "https://checkout.test/2"

    monkeypatch.setattr("stripe.checkout.Session.create", lambda **_: DummySession())

    with TestClient(app) as client:
        response = client.post(
            "/api/payment/checkout-session",
            json={
                "mode": "subscription",
                "plan": "sub_monthly",
                "email": "sub@example.com",
                "clickid": "sub-001",
                "locale": "en",
            },
        )

        assert response.status_code == 200
        assert response.json()["session_id"] == "cs_test_2"


def test_webhook_idempotency_and_paid_status(monkeypatch) -> None:
    class DummySession:
        id = "cs_test_paid"
        url = "https://checkout.test/paid"

    monkeypatch.setattr("stripe.checkout.Session.create", lambda **_: DummySession())

    with TestClient(app) as client:
        create_response = client.post(
            "/api/payment/checkout-session",
            json={
                "mode": "one_time",
                "plan": "one_time_basic",
                "email": "paid@example.com",
                "clickid": "paid-001",
                "locale": "ru",
            },
        )
        assert create_response.status_code == 200
        order_id = create_response.json()["order_id"]

        event = {
            "id": "evt_test_1",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_test_paid",
                    "payment_intent": "pi_1",
                    "customer": "cus_1",
                    "metadata": {"order_id": order_id},
                }
            },
        }

        monkeypatch.setattr("stripe.Webhook.construct_event", lambda payload, sig, secret: event)

        response = client.post("/api/stripe/webhook", headers={"stripe-signature": "t"}, content=b"{}")
        assert response.status_code == 200
        assert response.json() == {"ok": True, "duplicate": False}

        duplicate = client.post("/api/stripe/webhook", headers={"stripe-signature": "t"}, content=b"{}")
        assert duplicate.status_code == 200
        assert duplicate.json() == {"ok": True, "duplicate": True}

        status = client.get("/api/payment/session-status", params={"session_id": "cs_test_paid"})
        assert status.status_code == 200
        payload = status.json()
        assert payload["payment_status"] == "paid"
        assert payload["access_status"] == "token_issued"


def test_webhook_sends_server_side_mobi_slon_pay_success_once(monkeypatch) -> None:
    class DummySession:
        id = "cs_test_paid_postback"
        url = "https://checkout.test/postback"

    class DummyPostbackResponse:
        status_code = 200
        text = "OK"

    captured_calls: list[dict[str, object]] = []

    def fake_httpx_post(
        url: str,
        *,
        params: dict[str, str],
        timeout: float,
    ) -> DummyPostbackResponse:
        captured_calls.append({"url": url, "params": params, "timeout": timeout})
        return DummyPostbackResponse()

    monkeypatch.setattr("stripe.checkout.Session.create", lambda **_: DummySession())
    monkeypatch.setattr("httpx.post", fake_httpx_post)
    settings = get_settings()
    settings.mobi_slon_postback_url = "https://mobi-slon.example/index.php"

    try:
        with TestClient(app) as client:
            create_response = client.post(
                "/api/payment/checkout-session",
                json={
                    "mode": "one_time",
                    "plan": "one_time_basic",
                    "email": "postback@example.com",
                    "clickid": "pb-001",
                    "locale": "en",
                },
            )
            assert create_response.status_code == 200
            order_id = create_response.json()["order_id"]

            event = {
                "id": "evt_postback_1",
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        "id": "cs_test_paid_postback",
                        "payment_intent": "pi_pb_1",
                        "customer": "cus_pb_1",
                        "metadata": {"order_id": order_id},
                    }
                },
            }
            monkeypatch.setattr("stripe.Webhook.construct_event", lambda payload, sig, secret: event)

            response = client.post("/api/stripe/webhook", headers={"stripe-signature": "sig-1"}, content=b"{}")
            assert response.status_code == 200
            assert response.json() == {"ok": True, "duplicate": False}

            duplicate = client.post("/api/stripe/webhook", headers={"stripe-signature": "sig-1"}, content=b"{}")
            assert duplicate.status_code == 200
            assert duplicate.json() == {"ok": True, "duplicate": True}
    finally:
        settings.mobi_slon_postback_url = ""

    assert len(captured_calls) == 1
    call = captured_calls[0]
    assert call["url"] == "https://mobi-slon.example/index.php"
    assert call["params"] == {"cnv_id": "pb-001", "payout": "9.99", "cnv_status": "pay_success"}


def test_frontend_relay_mobi_slon_event_post(monkeypatch) -> None:
    class DummyPostbackResponse:
        status_code = 200
        text = "OK"

    captured_calls: list[dict[str, object]] = []

    def fake_httpx_post(
        url: str,
        *,
        params: dict[str, str],
        timeout: float,
    ) -> DummyPostbackResponse:
        captured_calls.append({"url": url, "params": params, "timeout": timeout})
        return DummyPostbackResponse()

    monkeypatch.setattr("httpx.post", fake_httpx_post)
    settings = get_settings()
    settings.mobi_slon_postback_url = "https://mobi-slon.example/index.php"

    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/tracking/mobi-slon-event",
                json={
                    "status": "block6_completed",
                    "clickid": "relay-001",
                    "session_id": "sess_123",
                    "page_path": "/block-6?clickid=relay-001",
                    "tracking_params": {"utm_source": "meta", "utm_campaign": "q1"},
                },
            )
    finally:
        settings.mobi_slon_postback_url = ""

    assert response.status_code == 200
    assert response.json() == {"accepted": True, "forwarded": True}
    assert len(captured_calls) == 1
    call = captured_calls[0]
    assert call["url"] == "https://mobi-slon.example/index.php"
    assert call["params"] == {
        "cnv_id": "relay-001",
        "payout": "0",
        "cnv_status": "block6_completed",
        "utm_source": "meta",
        "utm_campaign": "q1",
    }


def test_frontend_relay_mobi_slon_event_get_fallback(monkeypatch) -> None:
    class DummyPostbackResponse:
        status_code = 200
        text = "OK"

    captured_calls: list[dict[str, object]] = []

    def fake_httpx_post(
        url: str,
        *,
        params: dict[str, str],
        timeout: float,
    ) -> DummyPostbackResponse:
        captured_calls.append({"url": url, "params": params, "timeout": timeout})
        return DummyPostbackResponse()

    monkeypatch.setattr("httpx.post", fake_httpx_post)
    settings = get_settings()
    settings.mobi_slon_postback_url = "https://mobi-slon.example/index.php"

    try:
        with TestClient(app) as client:
            response = client.get(
                "/api/tracking/mobi-slon-event",
                params={
                    "status": "block7_completed",
                    "clickid": "relay-002",
                    "utm_medium": "cpc",
                    "utm_campaign": "launch",
                },
            )
    finally:
        settings.mobi_slon_postback_url = ""

    assert response.status_code == 200
    assert response.json() == {"accepted": True, "forwarded": True}
    assert len(captured_calls) == 1
    call = captured_calls[0]
    assert call["params"] == {
        "cnv_id": "relay-002",
        "payout": "0",
        "cnv_status": "block7_completed",
        "utm_medium": "cpc",
        "utm_campaign": "launch",
    }


def test_frontend_relay_mobi_slon_event_rejects_invalid_clickid() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/tracking/mobi-slon-event",
            json={
                "status": "transition_to_payment",
                "clickid": "!!!",
                "tracking_params": {},
            },
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid clickid"


def test_frontend_relay_mobi_slon_event_rejects_removed_pay_status() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/tracking/mobi-slon-event",
            json={
                "status": "pay",
                "clickid": "valid-click-1",
                "tracking_params": {},
            },
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "Unknown status"


def test_frontend_relay_mobi_slon_event_rejects_unknown_status() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/tracking/mobi-slon-event",
            json={
                "status": "unknown_event",
                "clickid": "valid-click-1",
                "tracking_params": {},
            },
        )

    assert response.status_code == 400
    assert response.json()["detail"] == "Unknown status"


def test_restore_request_and_confirm(monkeypatch) -> None:
    class DummySession:
        id = "cs_restore"
        url = "https://checkout.test/restore"

    monkeypatch.setattr("stripe.checkout.Session.create", lambda **_: DummySession())

    with TestClient(app) as client:
        create_response = client.post(
            "/api/payment/checkout-session",
            json={
                "mode": "one_time",
                "plan": "one_time_basic",
                "email": "restore@example.com",
                "clickid": "restore-001",
                "locale": "ru",
            },
        )
        order_id = create_response.json()["order_id"]

        event = {
            "id": "evt_restore",
            "type": "checkout.session.completed",
            "data": {"object": {"id": "cs_restore", "metadata": {"order_id": order_id}}},
        }
        monkeypatch.setattr("stripe.Webhook.construct_event", lambda payload, sig, secret: event)

        webhook_response = client.post("/api/stripe/webhook", headers={"stripe-signature": "x"}, content=b"{}")
        assert webhook_response.status_code == 200

        request_response = client.post("/api/auth/restore/request", json={"email": "restore@example.com"})
        assert request_response.status_code == 200
        assert request_response.json()["status"] == "otp_logged"

        # OTP is not exposed by API; this validates that wrong OTP is rejected.
        confirm_response = client.post(
            "/api/auth/restore/confirm",
            json={"email": "restore@example.com", "otp": "000000", "telegram_user_id": "123"},
        )
        assert confirm_response.status_code == 400
        assert confirm_response.json()["detail"] == "Invalid OTP"


def test_bot_internal_auth_required() -> None:
    with TestClient(app) as client:
        response = client.post("/api/bot/access/status", json={"telegram_user_id": "1"})
        assert response.status_code == 401


def test_bot_access_status_unpaid_with_internal_token() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/bot/access/status",
            json={"telegram_user_id": "404"},
            headers={"X-Internal-Token": "test-internal-token"},
        )
        assert response.status_code == 200
        assert response.json()["is_paid"] is False


def test_bot_access_status_paid_after_activation(monkeypatch) -> None:
    class DummySession:
        id = "cs_bot_paid"
        url = "https://checkout.test/bot-paid"

    monkeypatch.setattr("stripe.checkout.Session.create", lambda **_: DummySession())

    with TestClient(app) as client:
        create_response = client.post(
            "/api/payment/checkout-session",
            json={
                "mode": "one_time",
                "plan": "one_time_basic",
                "email": "bot-paid@example.com",
                "clickid": "bot-paid-001",
                "locale": "en",
            },
        )
        assert create_response.status_code == 200
        order_id = create_response.json()["order_id"]

        event = {
            "id": "evt_bot_paid",
            "type": "checkout.session.completed",
            "data": {"object": {"id": "cs_bot_paid", "metadata": {"order_id": order_id}}},
        }
        monkeypatch.setattr("stripe.Webhook.construct_event", lambda payload, sig, secret: event)
        webhook_response = client.post("/api/stripe/webhook", headers={"stripe-signature": "x"}, content=b"{}")
        assert webhook_response.status_code == 200

        session_status = client.get("/api/payment/session-status", params={"session_id": "cs_bot_paid"})
        assert session_status.status_code == 200
        activation_link = session_status.json()["activation_link"]
        assert activation_link
        activation_token = activation_link.split("start=")[1]

        activate_response = client.post(
            "/api/bot/access/activate",
            json={"activation_token": activation_token, "telegram_user_id": "777"},
            headers={"X-Internal-Token": "test-internal-token"},
        )
        assert activate_response.status_code == 200
        assert activate_response.json()["access_granted"] is True

        paid_status = client.post(
            "/api/bot/access/status",
            json={"telegram_user_id": "777"},
            headers={"X-Internal-Token": "test-internal-token"},
        )
        assert paid_status.status_code == 200
        payload = paid_status.json()
        assert payload["is_paid"] is True
        assert payload["access_status"] == "active"


def test_subscription_access_lifecycle(monkeypatch) -> None:
    class DummySession:
        id = "cs_sub_lifecycle"
        url = "https://checkout.test/sub-lifecycle"

    monkeypatch.setattr("stripe.checkout.Session.create", lambda **_: DummySession())

    with TestClient(app) as client:
        create_response = client.post(
            "/api/payment/checkout-session",
            json={
                "mode": "subscription",
                "plan": "sub_monthly",
                "email": "sub-lifecycle@example.com",
                "clickid": "sub-life-001",
                "locale": "en",
            },
        )
        assert create_response.status_code == 200
        order_id = create_response.json()["order_id"]

        completed_event = {
            "id": "evt_sub_completed",
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "id": "cs_sub_lifecycle",
                    "customer": "cus_sub_1",
                    "subscription": "sub_1",
                    "metadata": {"order_id": order_id},
                }
            },
        }
        monkeypatch.setattr("stripe.Webhook.construct_event", lambda payload, sig, secret: completed_event)
        completed_response = client.post("/api/stripe/webhook", headers={"stripe-signature": "x"}, content=b"{}")
        assert completed_response.status_code == 200

        session_status = client.get("/api/payment/session-status", params={"session_id": "cs_sub_lifecycle"})
        activation_link = session_status.json()["activation_link"]
        assert activation_link
        activation_token = activation_link.split("start=")[1]

        activate_response = client.post(
            "/api/bot/access/activate",
            json={"activation_token": activation_token, "telegram_user_id": "999"},
            headers={"X-Internal-Token": "test-internal-token"},
        )
        assert activate_response.status_code == 200

        payment_failed_event = {
            "id": "evt_sub_failed",
            "type": "invoice.payment_failed",
            "data": {
                "object": {
                    "customer": "cus_sub_1",
                    "subscription": "sub_1",
                    "lines": {"data": [{"period": {"end": 1711111111}}]},
                }
            },
        }
        monkeypatch.setattr("stripe.Webhook.construct_event", lambda payload, sig, secret: payment_failed_event)
        failed_response = client.post("/api/stripe/webhook", headers={"stripe-signature": "x"}, content=b"{}")
        assert failed_response.status_code == 200

        status_after_failed = client.post(
            "/api/bot/access/status",
            json={"telegram_user_id": "999"},
            headers={"X-Internal-Token": "test-internal-token"},
        )
        assert status_after_failed.status_code == 200
        assert status_after_failed.json()["is_paid"] is False
        assert status_after_failed.json()["access_status"] == "expired"

        paid_event = {
            "id": "evt_sub_paid",
            "type": "invoice.paid",
            "data": {
                "object": {
                    "customer": "cus_sub_1",
                    "subscription": "sub_1",
                    "lines": {"data": [{"period": {"end": 1712222222}}]},
                }
            },
        }
        monkeypatch.setattr("stripe.Webhook.construct_event", lambda payload, sig, secret: paid_event)
        paid_response = client.post("/api/stripe/webhook", headers={"stripe-signature": "x"}, content=b"{}")
        assert paid_response.status_code == 200

        status_after_paid = client.post(
            "/api/bot/access/status",
            json={"telegram_user_id": "999"},
            headers={"X-Internal-Token": "test-internal-token"},
        )
        assert status_after_paid.status_code == 200
        assert status_after_paid.json()["is_paid"] is True
        assert status_after_paid.json()["access_status"] == "active"

        deleted_event = {
            "id": "evt_sub_deleted",
            "type": "customer.subscription.deleted",
            "data": {
                "object": {
                    "id": "sub_1",
                    "customer": "cus_sub_1",
                    "current_period_end": 1713333333,
                }
            },
        }
        monkeypatch.setattr("stripe.Webhook.construct_event", lambda payload, sig, secret: deleted_event)
        deleted_response = client.post("/api/stripe/webhook", headers={"stripe-signature": "x"}, content=b"{}")
        assert deleted_response.status_code == 200

        status_after_deleted = client.post(
            "/api/bot/access/status",
            json={"telegram_user_id": "999"},
            headers={"X-Internal-Token": "test-internal-token"},
        )
        assert status_after_deleted.status_code == 200
        assert status_after_deleted.json()["is_paid"] is False
        assert status_after_deleted.json()["access_status"] == "revoked"


def test_meta_event_status_required() -> None:
    with TestClient(app) as client:
        response = client.get("/api/tracking/meta-event")

        assert response.status_code == 400
        assert response.json() == {"error": "status is required"}


def test_meta_event_forwarding(monkeypatch) -> None:
    captured: dict[str, object] = {}

    class DummyResponse:
        status_code = 200
        text = ""

        @staticmethod
        def json() -> dict[str, int]:
            return {"events_received": 1}

    def fake_post(url: str, *, params: dict[str, str], json: dict[str, object], timeout: float) -> DummyResponse:
        captured["url"] = url
        captured["params"] = params
        captured["json"] = json
        captured["timeout"] = timeout
        return DummyResponse()

    monkeypatch.setattr("httpx.post", fake_post)

    with TestClient(app) as client:
        response = client.get(
            "/api/tracking/meta-event",
            params={"status": "pay_success", "fbclid": "fb.1.123", "ip": "1.2.3.4", "ua": "Mozilla/Test"},
        )

        assert response.status_code == 200
        assert response.json() == {"events_received": 1}
        assert captured["url"] == "https://graph.facebook.com/v18.0/1052620673116886/events"
        assert captured["params"] == {"access_token": "test-meta-token"}
        payload = captured["json"]
        assert isinstance(payload, dict)
        assert payload["data"][0]["event_name"] == "pay_success"
        assert payload["data"][0]["user_data"]["fbc"] == "fb.1.123"
        assert payload["data"][0]["user_data"]["client_ip_address"] == "1.2.3.4"
        assert payload["data"][0]["user_data"]["client_user_agent"] == "Mozilla/Test"
