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
os.environ["BOT_ADMIN_IDS"] = "111,222"
os.environ["META_PIXEL_ID"] = "1052620673116886"
os.environ["META_ACCESS_TOKEN"] = "test-meta-token"
os.environ["META_GRAPH_API_VERSION"] = "v18.0"

sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.main import app
import app.main as app_main
from app.core.config import get_settings
from app.core.db.session import SessionLocal, init_db
from app.core.models.payment import HttpRequestLog, MobiSlonRequestLog, Order, PromoOffer


def _create_promo_offer(
    *,
    code: str = "VIPDEAL",
    is_active: bool = True,
    currency: str = "usd",
    weekly: int = 199,
    monthly: int = 3900,
    yearly: int = 9900,
) -> None:
    init_db()
    with SessionLocal() as db:
        db.add(
            PromoOffer(
                code=code,
                is_active=is_active,
                currency=currency,
                sub_weekly_amount_minor=weekly,
                sub_monthly_amount_minor=monthly,
                sub_yearly_amount_minor=yearly,
            )
        )
        db.commit()


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


def test_checkout_session_weekly_subscription(monkeypatch) -> None:
    class DummySession:
        id = "cs_test_weekly"
        url = "https://checkout.test/weekly"

    monkeypatch.setattr("stripe.checkout.Session.create", lambda **_: DummySession())

    with TestClient(app) as client:
        response = client.post(
            "/api/payment/checkout-session",
            json={
                "mode": "subscription",
                "plan": "sub_weekly",
                "email": "weekly@example.com",
                "clickid": "sub-weekly-001",
                "locale": "en",
            },
        )

        assert response.status_code == 200
        assert response.json()["session_id"] == "cs_test_weekly"


def test_checkout_session_yearly_subscription(monkeypatch) -> None:
    class DummySession:
        id = "cs_test_yearly"
        url = "https://checkout.test/yearly"

    monkeypatch.setattr("stripe.checkout.Session.create", lambda **_: DummySession())

    with TestClient(app) as client:
        response = client.post(
            "/api/payment/checkout-session",
            json={
                "mode": "subscription",
                "plan": "sub_yearly",
                "email": "yearly@example.com",
                "clickid": "sub-yearly-001",
                "locale": "en",
            },
        )

        assert response.status_code == 200
        assert response.json()["session_id"] == "cs_test_yearly"


def test_payment_plans_endpoint_returns_public_subscription_catalog() -> None:
    with TestClient(app) as client:
        response = client.get("/api/payment/plans")

    assert response.status_code == 200
    payload = response.json()
    assert [plan["code"] for plan in payload] == ["sub_yearly", "sub_monthly", "sub_weekly"]
    assert payload[0]["billing_period"] == "year"
    assert payload[1]["is_default"] is True
    assert payload[1]["is_highlighted"] is True
    assert payload[1]["badge"] == "Most popular"


def test_payment_plans_endpoint_returns_promo_prices_for_valid_code() -> None:
    _create_promo_offer(code="VIP999", weekly=199, monthly=3500, yearly=8900)
    settings = get_settings()

    with TestClient(app) as client:
        response = client.get("/api/payment/plans", params={"promo_code": "vip999"})

    assert response.status_code == 200
    payload = {item["code"]: item for item in response.json()}
    assert payload["sub_weekly"]["price"]["amount_minor"] == 199
    assert payload["sub_weekly"]["compare_at_price"]["amount_minor"] == 1999
    assert payload["sub_weekly"]["compare_at_per_day_price"]["amount_minor"] == 285
    assert payload["sub_weekly"]["badge"] == "PROMO"
    assert payload["sub_monthly"]["price"]["amount_minor"] == 3500
    assert payload["sub_monthly"]["compare_at_price"]["amount_minor"] == 6900
    assert payload["sub_monthly"]["badge"] == "PROMO"
    assert payload["sub_yearly"]["price"]["amount_minor"] == 8900
    assert payload["sub_yearly"]["compare_at_price"]["amount_minor"] == settings.pay_sub_yearly_amount_minor
    assert payload["sub_yearly"]["badge"] == "PROMO"


def test_payment_plans_endpoint_rejects_invalid_promo_code() -> None:
    with TestClient(app) as client:
        response = client.get("/api/payment/plans", params={"promo_code": "missing"})

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "promo_invalid"


def test_payment_plans_endpoint_is_logged_in_http_request_logs() -> None:
    with TestClient(app) as client:
        response = client.get("/api/payment/plans")

    assert response.status_code == 200
    assert response.headers["X-Request-ID"]

    with SessionLocal() as db:
        http_log = db.query(HttpRequestLog).filter(HttpRequestLog.request_id == response.headers["X-Request-ID"]).one()

    assert http_log.path == "/api/payment/plans"
    assert http_log.status_code == 200
    assert http_log.response_body is not None


def test_payment_plans_endpoint_rejects_invalid_default_configuration() -> None:
    settings = get_settings()
    original_weekly = settings.pay_sub_weekly_is_default
    original_monthly = settings.pay_sub_monthly_is_default
    original_yearly = settings.pay_sub_yearly_is_default
    settings.pay_sub_weekly_is_default = False
    settings.pay_sub_monthly_is_default = False
    settings.pay_sub_yearly_is_default = False

    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.get("/api/payment/plans")
    finally:
        settings.pay_sub_weekly_is_default = original_weekly
        settings.pay_sub_monthly_is_default = original_monthly
        settings.pay_sub_yearly_is_default = original_yearly

    assert response.status_code == 500


def test_checkout_session_subscription_applies_promo_price_and_saves_code(monkeypatch) -> None:
    class DummySession:
        id = "cs_test_promo_monthly"
        url = "https://checkout.test/promo-monthly"

    captured: dict[str, object] = {}

    def fake_session_create(**kwargs):
        captured.update(kwargs)
        return DummySession()

    _create_promo_offer(code="SPECIAL50", monthly=5000)
    monkeypatch.setattr("stripe.checkout.Session.create", fake_session_create)

    with TestClient(app) as client:
        response = client.post(
            "/api/payment/checkout-session",
            json={
                "mode": "subscription",
                "plan": "sub_monthly",
                "email": "promo@example.com",
                "clickid": "promo-001",
                "locale": "en",
                "promo_code": "special50",
            },
        )

        assert response.status_code == 200
        order_id = response.json()["order_id"]

    line_items = captured["line_items"]
    assert isinstance(line_items, list)
    assert line_items[0]["price_data"]["unit_amount"] == 5000
    assert line_items[0]["price_data"]["currency"] == "usd"
    assert captured["metadata"]["promo_code"] == "SPECIAL50"

    with SessionLocal() as db:
        order = db.query(Order).filter(Order.id == order_id).one()
    assert order.promo_code == "SPECIAL50"
    assert order.amount_minor == 5000


def test_checkout_session_rejects_invalid_promo_code(monkeypatch) -> None:
    def fail_if_called(**_):
        raise AssertionError("Stripe checkout should not be called for invalid promo code")

    monkeypatch.setattr("stripe.checkout.Session.create", fail_if_called)

    with TestClient(app) as client:
        response = client.post(
            "/api/payment/checkout-session",
            json={
                "mode": "subscription",
                "plan": "sub_monthly",
                "email": "invalid-promo@example.com",
                "clickid": "promo-002",
                "locale": "en",
                "promo_code": "missing",
            },
        )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "promo_invalid"


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


def test_frontend_relay_mobi_slon_event_accepts_new_pay_statuses(monkeypatch) -> None:
    class DummyPostbackResponse:
        status_code = 200
        text = "OK"

    def fake_httpx_post(
        url: str,
        *,
        params: dict[str, str],
        timeout: float,
    ) -> DummyPostbackResponse:
        return DummyPostbackResponse()

    monkeypatch.setattr("httpx.post", fake_httpx_post)
    settings = get_settings()
    settings.mobi_slon_postback_url = "https://mobi-slon.example/index.php"

    try:
        with TestClient(app) as client:
            for status in (
                "pay_email_entered",
                "pay_plan_weekly_selected",
                "pay_plan_monthly_selected",
                "pay_plan_yearly_selected",
            ):
                response = client.post(
                    "/api/events/mobi-slon",
                    json={"status": status, "clickid": "pay-event-001", "tracking_params": {}},
                )
                assert response.status_code == 200
                assert response.json() == {"accepted": True, "forwarded": True}
    finally:
        settings.mobi_slon_postback_url = ""


def test_frontend_relay_mobi_slon_event_forwards_email_tracking_param(monkeypatch) -> None:
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
                "/api/events/mobi-slon",
                json={
                    "status": "pay_email_entered",
                    "clickid": "pay-email-001",
                    "tracking_params": {"email": "user@example.com"},
                },
            )
    finally:
        settings.mobi_slon_postback_url = ""

    assert response.status_code == 200
    assert response.json() == {"accepted": True, "forwarded": True}
    assert len(captured_calls) == 1
    call = captured_calls[0]
    assert call["params"] == {
        "cnv_id": "pay-email-001",
        "payout": "0",
        "cnv_status": "pay_email_entered",
        "email": "user@example.com",
    }


def test_frontend_relay_mobi_slon_event_accepts_long_page_path(monkeypatch) -> None:
    class DummyPostbackResponse:
        status_code = 200
        text = "OK"

    def fake_httpx_post(
        url: str,
        *,
        params: dict[str, str],
        timeout: float,
    ) -> DummyPostbackResponse:
        return DummyPostbackResponse()

    monkeypatch.setattr("httpx.post", fake_httpx_post)
    settings = get_settings()
    settings.mobi_slon_postback_url = "https://mobi-slon.example/index.php"
    long_page_path = "/block-1?" + "&".join(f"utm_{idx}={'x' * 32}" for idx in range(40))

    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/events/mobi-slon",
                json={
                    "status": "block1_completed",
                    "clickid": "long-page-001",
                    "page_path": long_page_path,
                    "tracking_params": {},
                },
            )
    finally:
        settings.mobi_slon_postback_url = ""

    assert response.status_code == 200
    assert response.json() == {"accepted": True, "forwarded": True}


def test_frontend_relay_mobi_slon_event_logs_validation_errors() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/events/mobi-slon",
            json={
                "status": "start_quiz",
                "tracking_params": {},
            },
        )

    assert response.status_code == 422
    with SessionLocal() as db:
        mobi_log = db.query(MobiSlonRequestLog).order_by(MobiSlonRequestLog.created_at.desc()).first()
        http_log = db.query(HttpRequestLog).order_by(HttpRequestLog.created_at.desc()).first()

    assert mobi_log is not None
    assert mobi_log.incoming_path == "/api/events/mobi-slon"
    assert mobi_log.accepted is False
    assert mobi_log.forwarded is False
    assert mobi_log.validation_errors
    assert '"status":"start_quiz"' in (mobi_log.raw_body or "")
    assert http_log is not None
    assert http_log.path == "/api/events/mobi-slon"
    assert http_log.status_code == 422
    assert http_log.error_class == "RequestValidationError"


def test_frontend_relay_mobi_slon_event_logs_success_and_request_id(monkeypatch) -> None:
    class DummyPostbackResponse:
        status_code = 200
        text = '{"status":"success"}'

    def fake_httpx_post(
        url: str,
        *,
        params: dict[str, str],
        timeout: float,
    ) -> DummyPostbackResponse:
        return DummyPostbackResponse()

    monkeypatch.setattr("httpx.post", fake_httpx_post)
    settings = get_settings()
    settings.mobi_slon_postback_url = "https://mobi-slon.example/index.php"

    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/events/mobi-slon",
                json={
                    "status": "block2_completed",
                    "clickid": "relay-logged-001",
                    "tracking_params": {"utm_source": "meta"},
                },
            )
    finally:
        settings.mobi_slon_postback_url = ""

    assert response.status_code == 200
    assert response.headers["X-Request-ID"]

    with SessionLocal() as db:
        mobi_log = db.query(MobiSlonRequestLog).order_by(MobiSlonRequestLog.created_at.desc()).first()
        http_log = db.query(HttpRequestLog).order_by(HttpRequestLog.created_at.desc()).first()

    assert mobi_log is not None
    assert mobi_log.request_id == response.headers["X-Request-ID"]
    assert mobi_log.accepted is True
    assert mobi_log.forwarded is True
    assert mobi_log.upstream_status_code == 200
    assert mobi_log.attempt_count == 1
    assert http_log is not None
    assert http_log.request_id == response.headers["X-Request-ID"]
    assert http_log.path == "/api/events/mobi-slon"
    assert http_log.status_code == 200


def test_frontend_relay_mobi_slon_event_logs_upstream_failure(monkeypatch) -> None:
    def fake_httpx_post(
        url: str,
        *,
        params: dict[str, str],
        timeout: float,
    ) -> None:
        raise RuntimeError("upstream down")

    monkeypatch.setattr("httpx.post", fake_httpx_post)
    settings = get_settings()
    settings.mobi_slon_postback_url = "https://mobi-slon.example/index.php"

    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/events/mobi-slon",
                json={
                    "status": "block3_completed",
                    "clickid": "relay-failure-001",
                    "tracking_params": {},
                },
            )
    finally:
        settings.mobi_slon_postback_url = ""

    assert response.status_code == 200
    assert response.json() == {"accepted": True, "forwarded": False}

    with SessionLocal() as db:
        mobi_log = db.query(MobiSlonRequestLog).order_by(MobiSlonRequestLog.created_at.desc()).first()

    assert mobi_log is not None
    assert mobi_log.forwarded is False
    assert mobi_log.error_class == "RuntimeError"
    assert mobi_log.error_message == "upstream down"
    assert mobi_log.attempt_count == 3


def test_http_request_middleware_skips_bot_routes() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/bot/access/status",
            json={"telegram_user_id": "404"},
            headers={"X-Internal-Token": "test-internal-token"},
        )

    assert response.status_code == 200
    with SessionLocal() as db:
        bot_logs = db.query(HttpRequestLog).filter(HttpRequestLog.path == "/api/bot/access/status").all()

    assert bot_logs == []


def test_validation_error_sends_admin_alert(monkeypatch) -> None:
    alerts: list[str] = []

    def fake_send_admin_alert(*, text: str) -> bool:
        alerts.append(text)
        return True

    monkeypatch.setattr(app_main.admin_telegram_sender, "send_admin_alert", fake_send_admin_alert)

    with TestClient(app) as client:
        response = client.post(
            "/api/events/mobi-slon",
            json={
                "status": "start_quiz",
                "tracking_params": {},
            },
        )

    assert response.status_code == 422
    assert len(alerts) == 1
    assert "request_id:" in alerts[0]
    assert "/api/events/mobi-slon" in alerts[0]
    assert "422" in alerts[0]
    assert "RequestValidationError" in alerts[0]
    assert "<pre>" in alerts[0]


def test_http_400_sends_admin_alert(monkeypatch) -> None:
    alerts: list[str] = []

    def fake_send_admin_alert(*, text: str) -> bool:
        alerts.append(text)
        return True

    monkeypatch.setattr(app_main.admin_telegram_sender, "send_admin_alert", fake_send_admin_alert)

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
    assert len(alerts) == 1
    assert "/api/tracking/mobi-slon-event" in alerts[0]
    assert "400" in alerts[0]
    assert "Invalid clickid" in alerts[0]
    assert "<pre>" in alerts[0]


def test_http_500_sends_admin_alert(monkeypatch) -> None:
    alerts: list[str] = []

    def fake_send_admin_alert(*, text: str) -> bool:
        alerts.append(text)
        return True

    monkeypatch.setattr(app_main.admin_telegram_sender, "send_admin_alert", fake_send_admin_alert)

    settings = get_settings()
    original_weekly = settings.pay_sub_weekly_is_default
    original_monthly = settings.pay_sub_monthly_is_default
    original_yearly = settings.pay_sub_yearly_is_default
    settings.pay_sub_weekly_is_default = False
    settings.pay_sub_monthly_is_default = False
    settings.pay_sub_yearly_is_default = False

    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            response = client.get("/api/payment/plans")
    finally:
        settings.pay_sub_weekly_is_default = original_weekly
        settings.pay_sub_monthly_is_default = original_monthly
        settings.pay_sub_yearly_is_default = original_yearly

    assert response.status_code == 500
    assert len(alerts) == 1
    assert "/api/payment/plans" in alerts[0]
    assert "500" in alerts[0]
    assert "<pre>" in alerts[0]


def test_success_response_does_not_send_admin_alert(monkeypatch) -> None:
    alerts: list[str] = []

    def fake_send_admin_alert(*, text: str) -> bool:
        alerts.append(text)
        return True

    monkeypatch.setattr(app_main.admin_telegram_sender, "send_admin_alert", fake_send_admin_alert)

    with TestClient(app) as client:
        response = client.get("/api/payment/plans")

    assert response.status_code == 200
    assert alerts == []


def test_bot_routes_do_not_send_admin_alert(monkeypatch) -> None:
    alerts: list[str] = []

    def fake_send_admin_alert(*, text: str) -> bool:
        alerts.append(text)
        return True

    monkeypatch.setattr(app_main.admin_telegram_sender, "send_admin_alert", fake_send_admin_alert)

    with TestClient(app) as client:
        response = client.post("/api/bot/access/status", json={"telegram_user_id": "1"})

    assert response.status_code == 401
    assert alerts == []


def test_missing_admin_ids_keeps_response_and_skips_telegram(monkeypatch) -> None:
    calls: list[tuple[str, str]] = []

    def fake_send_message(*, chat_id: str, text: str) -> bool:
        calls.append((chat_id, text))
        return True

    monkeypatch.setattr(app_main.admin_telegram_sender, "_admin_chat_ids", [])
    monkeypatch.setattr(app_main.admin_telegram_sender, "_send_message", fake_send_message)

    with TestClient(app) as client:
        response = client.post(
            "/api/events/mobi-slon",
            json={
                "status": "start_quiz",
                "tracking_params": {},
            },
        )

    assert response.status_code == 422
    assert calls == []


def test_telegram_admin_alert_failure_does_not_change_response(monkeypatch) -> None:
    def fake_send_admin_alert(*, text: str) -> bool:
        raise RuntimeError("telegram down")

    monkeypatch.setattr(app_main.admin_telegram_sender, "send_admin_alert", fake_send_admin_alert)

    with TestClient(app) as client:
        response = client.post(
            "/api/events/mobi-slon",
            json={
                "status": "start_quiz",
                "tracking_params": {},
            },
        )

    assert response.status_code == 422
    assert response.headers["X-Request-ID"]


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


def test_bot_session_endpoints_require_internal_token() -> None:
    with TestClient(app) as client:
        response = client.post("/api/bot/session/start", json={"telegram_user_id": "1", "mode": "write_now"})
        assert response.status_code == 401

        response = client.post(
            "/api/bot/media/transcribe",
            json={
                "asset_type": "audio",
                "payload": {"media": {"mime_type": "audio/ogg", "content_base64": "AA=="}},
            },
        )
        assert response.status_code == 401


def test_bot_session_text_flow_generate_refine_reset(monkeypatch) -> None:
    def fake_write_now(self, user_prompt: str) -> dict[str, object]:
        assert "WriteNowResponseSchema" in user_prompt
        return {
            "primary_message": "Привет, давай продолжим разговор вечером?",
            "why": "Коротко и без давления.",
            "risks": ["Может выглядеть слишком общо"],
            "avoid_list": ["Не дави", "Не пиши стену текста", "Не манипулируй"],
            "next_step": "Подожди ответ 1-2 дня",
            "fallback_simple_version": "Привет! Продолжим вечером?",
            "alternatives": ["Привет, как твой день?"],
        }

    def fake_refine(self, user_prompt: str) -> dict[str, object]:
        assert "Уточнения пользователя" in user_prompt
        return {
            "primary_message": "Привет! Продолжим вечером, если удобно.",
            "why": "Сделано мягче и короче.",
            "fallback_simple_version": "Привет, продолжим вечером?",
            "alternatives": ["Если удобно, давай вечером созвонимся."],
        }

    monkeypatch.setattr("app.services.openai_bot.OpenAIBotClient.generate_write_now", fake_write_now)
    monkeypatch.setattr("app.services.openai_bot.OpenAIBotClient.refine_message", fake_refine)

    with TestClient(app) as client:
        start_resp = client.post(
            "/api/bot/session/start",
            json={"telegram_user_id": "555", "mode": "write_now"},
            headers={"X-Internal-Token": "test-internal-token"},
        )
        assert start_resp.status_code == 200
        session_id = start_resp.json()["session_id"]

        asset_resp = client.post(
            f"/api/bot/session/{session_id}/asset",
            json={
                "telegram_user_id": "555",
                "asset_type": "text",
                "payload": {"text": "Она давно не отвечает, хочу мягко пингануть."},
                "telegram_message_id": 101,
            },
            headers={"X-Internal-Token": "test-internal-token"},
        )
        assert asset_resp.status_code == 200

        close_resp = client.post(
            f"/api/bot/session/{session_id}/batch/close",
            json={"telegram_user_id": "555"},
            headers={"X-Internal-Token": "test-internal-token"},
        )
        assert close_resp.status_code == 200
        assert close_resp.json()["state"] == "ready_to_generate"

        gen_resp = client.post(
            f"/api/bot/session/{session_id}/generate",
            json={"telegram_user_id": "555", "scenario": "standard", "constraints": [], "tried_actions": []},
            headers={"X-Internal-Token": "test-internal-token"},
        )
        assert gen_resp.status_code == 200
        assert gen_resp.json()["state"] == "awaiting_refinement"
        assert gen_resp.json()["ui_payload"]["primary_message"]

        refine_resp = client.post(
            f"/api/bot/session/{session_id}/refine",
            json={"telegram_user_id": "555", "command": "Сделай мягче и короче"},
            headers={"X-Internal-Token": "test-internal-token"},
        )
        assert refine_resp.status_code == 200
        assert refine_resp.json()["primary_message"] == "Привет! Продолжим вечером, если удобно."

        reset_resp = client.post(
            f"/api/bot/session/{session_id}/reset",
            json={"telegram_user_id": "555"},
            headers={"X-Internal-Token": "test-internal-token"},
        )
        assert reset_resp.status_code == 200
        assert reset_resp.json()["status"] == "closed"
