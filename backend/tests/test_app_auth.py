from __future__ import annotations

import os
from pathlib import Path
import sys
from datetime import timedelta
from uuid import uuid4

from fastapi.testclient import TestClient

TEST_DB_PATH = Path(__file__).resolve().parent / "test_app.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["STRIPE_SECRET_KEY"] = "sk_test_dummy"
os.environ["STRIPE_PUBLISHABLE_KEY"] = "pk_test_dummy"
os.environ["STRIPE_WEBHOOK_SECRET"] = "whsec_dummy"
os.environ["SITE_PUBLIC_BASE_URL"] = "https://flirto.guru"
os.environ["PAY_PUBLIC_BASE_URL"] = "https://pay.flirto.guru"
os.environ["APP_PUBLIC_BASE_URL"] = "https://app.flirto.guru"
os.environ["API_PUBLIC_BASE_URL"] = "https://api.flirto.guru"
os.environ["BACKEND_CORS_ALLOW_ORIGINS"] = "https://flirto.guru,https://pay.flirto.guru,https://app.flirto.guru,https://lp1.flirto.guru"
os.environ["PAY_SUB_WEEKLY_SORT_ORDER"] = "30"
os.environ["PAY_SUB_MONTHLY_SORT_ORDER"] = "20"
os.environ["PAY_SUB_QUARTERLY_SORT_ORDER"] = "10"
os.environ["PAY_SUB_YEARLY_SORT_ORDER"] = "10"
os.environ["ACCESS_TOKEN_SECRET"] = "test-secret"
os.environ["APP_AUTH_SECRET"] = "test-app-auth-secret"
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
from app.core.db.session import SessionLocal, init_db
from app.core.models.payment import AccessCode, AppEmailCode, Order, utcnow


def _login_via_email_code(client: TestClient, monkeypatch, email: str) -> dict:
    captured: dict[str, str] = {}

    def fake_send_app_login_code(self, *, email: str, code: str, allow_plain_code: bool, locale: str) -> None:
        captured["code"] = code
        captured["locale"] = locale

    monkeypatch.setattr("app.core.notifications.LogOnlyEmailSender.send_app_login_code", fake_send_app_login_code)

    response = client.post("/api/app/auth/email-code/request", json={"email": email})
    assert response.status_code == 200
    assert response.json() == {"status": "code_sent"}
    assert len(captured["code"]) == 6
    assert captured["locale"] == "en"

    with SessionLocal() as db:
        assert db.query(AppEmailCode).filter(AppEmailCode.email == email).count() >= 1

    confirm = client.post("/api/app/auth/email-code/confirm", json={"email": email, "code": captured["code"]})
    assert confirm.status_code == 200
    return confirm.json()


def test_app_auth_login_me_logout(monkeypatch) -> None:
    init_db()
    with TestClient(app) as client:
        email = f"app-user-{uuid4()}@example.com"
        payload = _login_via_email_code(client, monkeypatch, email)
        assert payload["user"]["email"] == email
        assert payload["user"]["locale"] == "en"
        assert payload["access"]["has_access"] is False
        access_token = payload["tokens"]["access_token"]
        assert client.cookies.get("flirto_app_refresh")

        me = client.get("/api/app/auth/me", headers={"Authorization": f"Bearer {access_token}"})
        assert me.status_code == 200
        assert me.json()["user"]["email"] == email

        logout = client.post("/api/app/auth/logout")
        assert logout.status_code == 200
        assert logout.json() == {"ok": True}


def test_app_auth_updates_locale(monkeypatch) -> None:
    init_db()
    with TestClient(app) as client:
        payload = _login_via_email_code(client, monkeypatch, "locale-user@example.com")
        access_token = payload["tokens"]["access_token"]

        update = client.post(
            "/api/app/auth/locale",
            json={"locale": "ru"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert update.status_code == 200
        assert update.json()["user"]["locale"] == "ru"

        next_token = update.json()["tokens"]["access_token"]
        french = client.post(
            "/api/app/auth/locale",
            json={"locale": "fr"},
            headers={"Authorization": f"Bearer {next_token}"},
        )
        assert french.status_code == 200
        assert french.json()["user"]["locale"] == "fr"

        next_token = french.json()["tokens"]["access_token"]
        spanish = client.post(
            "/api/app/auth/locale",
            json={"locale": "es-ES"},
            headers={"Authorization": f"Bearer {next_token}"},
        )
        assert spanish.status_code == 200
        assert spanish.json()["user"]["locale"] == "es"

        next_token = spanish.json()["tokens"]["access_token"]
        fallback = client.post(
            "/api/app/auth/locale",
            json={"locale": "de"},
            headers={"Authorization": f"Bearer {next_token}"},
        )
        assert fallback.status_code == 200
        assert fallback.json()["user"]["locale"] == "en"


def test_app_auth_inherits_paid_access_from_order(monkeypatch) -> None:
    init_db()
    with SessionLocal() as db:
        db.add(
            Order(
                email="paid-user@example.com",
                clickid="direct",
                mode="subscription",
                plan="sub_monthly",
                locale="ru",
                amount_minor=1999,
                currency="usd",
                status="paid",
                fulfillment_status="fulfilled",
                access_status="active",
            )
        )
        db.commit()

    with TestClient(app) as client:
        payload = _login_via_email_code(client, monkeypatch, "paid-user@example.com")
        assert payload["access"]["has_access"] is True
        assert payload["access"]["plan"] == "sub_monthly"
        assert payload["access"]["status_label"] == "Active"

def test_app_access_code_redeem_grants_promo_access(monkeypatch) -> None:
    init_db()
    with SessionLocal() as db:
        db.add(
            AccessCode(
                code="FG-REDEEM01",
                is_active=True,
                expires_at=utcnow() + timedelta(days=7),
                max_redemptions=1,
                redeemed_count=0,
                created_by_telegram_user_id="111",
                created_by_telegram_username="admin",
            )
        )
        db.commit()

    with TestClient(app) as client:
        payload = _login_via_email_code(client, monkeypatch, "promo-user@example.com")
        access_token = payload["tokens"]["access_token"]
        assert payload["access"]["has_access"] is False

        redeem = client.post(
            "/api/app/access-code/redeem",
            json={"code": "FG-REDEEM01"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert redeem.status_code == 200
        redeemed_payload = redeem.json()
        assert redeemed_payload["access"]["has_access"] is True
        assert redeemed_payload["access"]["status_label"] == "Promo"
        assert redeemed_payload["access"]["access_status"] == "promo_active"


def test_expired_access_code_does_not_give_access(monkeypatch) -> None:
    init_db()
    with SessionLocal() as db:
        db.add(
            AccessCode(
                code="FG-EXPIRED1",
                is_active=True,
                expires_at=utcnow() - timedelta(days=1),
                max_redemptions=1,
                redeemed_count=0,
                created_by_telegram_user_id="111",
                created_by_telegram_username="admin",
            )
        )
        db.commit()

    with TestClient(app) as client:
        payload = _login_via_email_code(client, monkeypatch, "expired-promo@example.com")
        access_token = payload["tokens"]["access_token"]
        redeem = client.post(
            "/api/app/access-code/redeem",
            json={"code": "FG-EXPIRED1"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert redeem.status_code == 400
        assert payload["access"]["has_access"] is False
        assert payload["access"]["status_label"] == "Inactive"


def test_promo_access_does_not_override_paid_access(monkeypatch) -> None:
    init_db()
    with SessionLocal() as db:
        db.add(
            Order(
                email="paid-plus-manual@example.com",
                clickid="direct",
                mode="subscription",
                plan="sub_monthly",
                locale="ru",
                amount_minor=1999,
                currency="usd",
                status="paid",
                fulfillment_status="fulfilled",
                access_status="active",
            )
        )
        db.add(
            AccessCode(
                code="FG-PAIDPROMO",
                is_active=True,
                expires_at=utcnow() + timedelta(days=7),
                max_redemptions=1,
                redeemed_count=0,
                created_by_telegram_user_id="111",
                created_by_telegram_username="admin",
            )
        )
        db.commit()

    with TestClient(app) as client:
        payload = _login_via_email_code(client, monkeypatch, "paid-plus-manual@example.com")
        access_token = payload["tokens"]["access_token"]
        redeem = client.post(
            "/api/app/access-code/redeem",
            json={"code": "FG-PAIDPROMO"},
            headers={"Authorization": f"Bearer {access_token}"},
        )
        assert redeem.status_code == 200
        assert payload["access"]["has_access"] is True
        assert payload["access"]["plan"] == "sub_monthly"
        assert payload["access"]["access_status"] == "active"
        assert redeem.json()["access"]["status_label"] == "Active"


def test_app_paid_session_flow(monkeypatch) -> None:
    init_db()
    with SessionLocal() as db:
        db.add(
            Order(
                email="advisor@example.com",
                clickid="direct",
                mode="subscription",
                plan="sub_monthly",
                locale="ru",
                amount_minor=1999,
                currency="usd",
                status="paid",
                fulfillment_status="fulfilled",
                access_status="active",
            )
        )
        db.commit()

    captured_prompts: dict[str, str] = {}

    def fake_generate_analyze_case(self, prompt):
        captured_prompts["generate"] = prompt
        return {
            "diagnosis": "Диалог завис после свидания.",
            "core_leverage": "Вернуть легкий и спокойный тон.",
            "plan_24h": ["Отправь короткое сообщение без претензий сегодня вечером."],
            "plan_if_reply": ["Ответь тепло и предложи простой следующий шаг."],
            "plan_if_no_reply": ["Не дожимай и вернись через несколько дней с новым поводом."],
            "message_template": "Привет. Было приятно увидеться, давай без спешки продолжим общение :)",
            "avoid_list": ["Не дави", "Не оправдывайся", "Не пиши простыни"],
        }

    def fake_refine_analyze_case(self, prompt):
        captured_prompts["refine"] = prompt
        return {
            "diagnosis": "Диалогу нужен мягкий вход без давления.",
            "core_leverage": "Показать интерес и оставить ей пространство.",
            "plan_24h": ["Отправь одно теплое сообщение без ожидания немедленного ответа."],
            "plan_if_reply": ["Поддержи ее тон и предложи конкретную легкую встречу."],
            "plan_if_no_reply": ["Не пиши повторно минимум несколько дней."],
            "message_template": "Привет. Мне было приятно с тобой, если будет настроение — продолжим без спешки :)",
            "avoid_list": ["Не дави", "Не требуй ответа", "Не отправляй серию сообщений"],
        }

    monkeypatch.setattr("app.services.openai_bot.OpenAIBotClient.generate_analyze_case", fake_generate_analyze_case)
    monkeypatch.setattr("app.services.openai_bot.OpenAIBotClient.refine_analyze_case", fake_refine_analyze_case)

    with TestClient(app) as client:
        payload = _login_via_email_code(client, monkeypatch, "advisor@example.com")
        access_token = payload["tokens"]["access_token"]
        locale_update = client.post("/api/app/auth/locale", json={"locale": "en"}, headers={"Authorization": f"Bearer {access_token}"})
        assert locale_update.status_code == 200
        access_token = locale_update.json()["tokens"]["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}

        start = client.post("/api/app/session/start", json={"mode": "analyze_case"}, headers=headers)
        assert start.status_code == 200
        session_id = start.json()["session_id"]

        asset = client.post(
            f"/api/app/session/{session_id}/asset-text",
            json={"text": "Она перестала отвечать после свидания."},
            headers=headers,
        )
        assert asset.status_code == 200

        batch_close = client.post(f"/api/app/session/{session_id}/batch/close", headers=headers)
        assert batch_close.status_code == 200
        assert batch_close.json()["state"] == "awaiting_context_confirmation"

        confirm = client.post(
            f"/api/app/session/{session_id}/confirm-context",
            json={"action": "confirm:yes"},
            headers=headers,
        )
        assert confirm.status_code == 200
        assert confirm.json()["state"] == "ready_to_generate"

        generate = client.post(f"/api/app/session/{session_id}/generate", json={}, headers=headers)
        assert generate.status_code == 200
        assert generate.json()["ui_payload"]["diagnosis"] == "Диалог завис после свидания."
        assert "Write all user-visible values in natural English." in captured_prompts["generate"]

        refine = client.post(
            f"/api/app/session/{session_id}/refine",
            json={"command": "Сделай мягче"},
            headers=headers,
        )
        assert refine.status_code == 200
        assert refine.json()["ui_payload"]["message_template"].startswith("Привет.")
        assert "Write all user-visible values in natural English." in captured_prompts["refine"]

        reset_active = client.post("/api/app/session/reset-active", headers=headers)
        assert reset_active.status_code == 200
        assert reset_active.json()["closed_sessions"] >= 1


def test_app_analyze_case_refine_returns_analyze_case_payload(monkeypatch) -> None:
    init_db()
    with SessionLocal() as db:
        db.add(
            Order(
                email="analyze@example.com",
                clickid="direct",
                mode="subscription",
                plan="sub_monthly",
                locale="ru",
                amount_minor=1999,
                currency="usd",
                status="paid",
                fulfillment_status="fulfilled",
                access_status="active",
            )
        )
        db.commit()

    monkeypatch.setattr(
        "app.services.openai_bot.OpenAIBotClient.generate_analyze_case",
        lambda self, prompt: {
            "diagnosis": "Диалог завис после эмоционально перегруженного сообщения.",
            "core_leverage": "Снизить напряжение и вернуть простой шаг.",
            "plan_24h": ["Выжди до вечера и отправь короткий спокойный пинг."],
            "plan_if_reply": ["Поддержи легкий тон и переведи в конкретику."],
            "plan_if_no_reply": ["Не дожимай и вернись через несколько дней с новым поводом."],
            "message_template": "Привет. Поймал себя на мысли, что написал слишком тяжело. Давай без напряга :)",
            "avoid_list": ["Не дави", "Не выясняй отношения", "Не отправляй длинные сообщения"],
        },
    )
    monkeypatch.setattr(
        "app.services.openai_bot.OpenAIBotClient.refine_analyze_case",
        lambda self, prompt: {
            "diagnosis": "Сейчас важнее снять давление и не требовать реакции.",
            "core_leverage": "Дать ей безопасный вход обратно в диалог.",
            "plan_24h": ["Отправь одно короткое сообщение без претензий сегодня вечером."],
            "plan_if_reply": ["Ответь тепло и предложи один простой следующий шаг."],
            "plan_if_no_reply": ["Остановись и не пиши повторно минимум несколько дней."],
            "message_template": "Привет. Кажется, я в прошлый раз перегрузил сообщение. Без напряга: если захочешь, давай продолжим позже :)",
            "avoid_list": ["Не уговаривай", "Не оправдывайся слишком долго", "Не отправляй серию сообщений"],
        },
    )

    with TestClient(app) as client:
        payload = _login_via_email_code(client, monkeypatch, "analyze@example.com")
        access_token = payload["tokens"]["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}

        start = client.post("/api/app/session/start", json={"mode": "analyze_case"}, headers=headers)
        assert start.status_code == 200
        session_id = start.json()["session_id"]

        asset = client.post(
            f"/api/app/session/{session_id}/asset-text",
            json={"text": "После свидания я написал слишком тяжёлое сообщение, и она замолчала."},
            headers=headers,
        )
        assert asset.status_code == 200

        batch_close = client.post(f"/api/app/session/{session_id}/batch/close", headers=headers)
        assert batch_close.status_code == 200
        assert batch_close.json()["state"] == "awaiting_context_confirmation"

        confirm = client.post(
            f"/api/app/session/{session_id}/confirm-context",
            json={"action": "confirm:yes"},
            headers=headers,
        )
        assert confirm.status_code == 200
        assert confirm.json()["state"] == "ready_to_generate"

        generate = client.post(f"/api/app/session/{session_id}/generate", json={}, headers=headers)
        assert generate.status_code == 200
        assert generate.json()["ui_payload"]["diagnosis"] == "Диалог завис после эмоционально перегруженного сообщения."

        refine = client.post(
            f"/api/app/session/{session_id}/refine",
            json={"command": "Сделай план мягче и добавь более аккуратный шаблон"},
            headers=headers,
        )
        assert refine.status_code == 200
        refined_payload = refine.json()["ui_payload"]
        assert refined_payload["diagnosis"] == "Сейчас важнее снять давление и не требовать реакции."
        assert refined_payload["core_leverage"] == "Дать ей безопасный вход обратно в диалог."
        assert refined_payload["message_template"].startswith("Привет.")
        assert refine.json()["primary_message"] is None
        assert refine.json()["alternatives"] == []


def test_app_sessions_list_and_detail_restore(monkeypatch) -> None:
    init_db()
    with SessionLocal() as db:
        db.add(
            Order(
                email="history@example.com",
                clickid="direct",
                mode="subscription",
                plan="sub_monthly",
                locale="ru",
                amount_minor=1999,
                currency="usd",
                status="paid",
                fulfillment_status="fulfilled",
                access_status="active",
            )
        )
        db.commit()

    generate_prompts: list[str] = []

    def fake_generate_analyze_case(self, prompt):
        generate_prompts.append(prompt)
        return {
            "diagnosis": "Готовый разбор для возврата.",
            "core_leverage": "Потому что так лучше.",
            "plan_24h": ["Отправь короткое сообщение сегодня вечером."],
            "plan_if_reply": ["Ответь спокойно и предложи простой следующий шаг."],
            "plan_if_no_reply": ["Не дожимай и подожди несколько дней."],
            "message_template": "Готовый текст для возврата.",
            "avoid_list": ["Не дави", "Не спеши", "Не оправдывайся"],
        }

    monkeypatch.setattr("app.services.openai_bot.OpenAIBotClient.generate_analyze_case", fake_generate_analyze_case)

    with TestClient(app) as client:
        payload = _login_via_email_code(client, monkeypatch, "history@example.com")
        access_token = payload["tokens"]["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}

        first = client.post("/api/app/session/start", json={"mode": "analyze_case"}, headers=headers)
        second = client.post("/api/app/session/start", json={"mode": "analyze_case"}, headers=headers)
        assert first.status_code == 200
        assert second.status_code == 200
        first_id = first.json()["session_id"]
        second_id = second.json()["session_id"]
        assert first_id != second_id

        asset = client.post(
            f"/api/app/session/{first_id}/asset-text",
            json={"text": "Первое сообщение контекста"},
            headers=headers,
        )
        assert asset.status_code == 200

        batch_close = client.post(f"/api/app/session/{first_id}/batch/close", headers=headers)
        assert batch_close.status_code == 200
        assert batch_close.json()["state"] == "awaiting_context_confirmation"

        confirm = client.post(
            f"/api/app/session/{first_id}/confirm-context",
            json={"action": "confirm:yes"},
            headers=headers,
        )
        assert confirm.status_code == 200
        assert confirm.json()["state"] == "ready_to_generate"

        generate = client.post(f"/api/app/session/{first_id}/generate", json={}, headers=headers)
        assert generate.status_code == 200

        list_response = client.get("/api/app/sessions", headers=headers)
        assert list_response.status_code == 200
        session_ids = [item["session_id"] for item in list_response.json()]
        assert first_id in session_ids
        assert second_id in session_ids

        detail = client.get(f"/api/app/session/{first_id}", headers=headers)
        assert detail.status_code == 200
        payload = detail.json()
        assert payload["session_id"] == first_id
        assert payload["editable"] is True
        assert payload["ui_payload"]["message_template"] == "Готовый текст для возврата."
        assert payload["messages"][0]["text"] == "Первое сообщение контекста"
        assert payload["messages"][1]["kind"] == "assistant"
        assert payload["messages"][1]["text"] == "Готовый текст для возврата."
        assert payload["messages"][1]["ui_payload"]["core_leverage"] == "Потому что так лучше."

        follow_up = client.post(
            f"/api/app/session/{first_id}/asset-text",
            json={"text": "Она ответила и спросила, что я имею в виду."},
            headers=headers,
        )
        assert follow_up.status_code == 200
        assert client.post(f"/api/app/session/{first_id}/batch/close", headers=headers).status_code == 200
        confirm_again = client.post(
            f"/api/app/session/{first_id}/confirm-context",
            json={"action": "confirm:yes"},
            headers=headers,
        )
        assert confirm_again.status_code == 200
        generate_again = client.post(f"/api/app/session/{first_id}/generate", json={}, headers=headers)
        assert generate_again.status_code == 200
        assert len(generate_prompts) == 2
        assert "[user][text]" in generate_prompts[1]
        assert "[assistant][analysis][generate]" in generate_prompts[1]
        assert generate_prompts[1].index("[user][text]") < generate_prompts[1].index("[assistant][analysis][generate]")
        assert generate_prompts[1].index("[assistant][analysis][generate]") < generate_prompts[1].rindex("[user][text]")
        assert "[assistant] blocks are previous system advice" in generate_prompts[1]
        assert "Готовый текст для возврата." in generate_prompts[1]
        assert "Потому что так лучше." in generate_prompts[1]
        assert "Она ответила и спросила" in generate_prompts[1]

        close_first = client.post(f"/api/app/session/{first_id}/reset", headers=headers)
        assert close_first.status_code == 200

        closed_detail = client.get(f"/api/app/session/{first_id}", headers=headers)
        assert closed_detail.status_code == 200
        assert closed_detail.json()["editable"] is False


def test_app_session_delete_asset_returns_to_collect_and_updates_detail(monkeypatch) -> None:
    init_db()
    with SessionLocal() as db:
        db.add(
            Order(
                email="delete@example.com",
                clickid="direct",
                mode="subscription",
                plan="sub_monthly",
                locale="ru",
                amount_minor=1999,
                currency="usd",
                status="paid",
                fulfillment_status="fulfilled",
                access_status="active",
            )
        )
        db.commit()

    with TestClient(app) as client:
        payload = _login_via_email_code(client, monkeypatch, "delete@example.com")
        access_token = payload["tokens"]["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}

        start = client.post("/api/app/session/start", json={"mode": "analyze_case"}, headers=headers)
        session_id = start.json()["session_id"]

        first_asset = client.post(
            f"/api/app/session/{session_id}/asset-text",
            json={"text": "Первый фрагмент"},
            headers=headers,
        )
        second_asset = client.post(
            f"/api/app/session/{session_id}/asset-text",
            json={"text": "Второй фрагмент"},
            headers=headers,
        )
        assert first_asset.status_code == 200
        assert second_asset.status_code == 200

        batch_close = client.post(f"/api/app/session/{session_id}/batch/close", headers=headers)
        assert batch_close.status_code == 200
        assert batch_close.json()["state"] == "awaiting_context_confirmation"

        deleted = client.delete(
            f"/api/app/session/{session_id}/asset/{first_asset.json()['asset_id']}",
            headers=headers,
        )
        assert deleted.status_code == 200
        assert deleted.json()["deleted"] is True
        assert deleted.json()["remaining_items"] == 1
        assert deleted.json()["state"] == "collecting_context"
        assert "Второй фрагмент" in deleted.json()["context_preview"]

        detail = client.get(f"/api/app/session/{session_id}", headers=headers)
        assert detail.status_code == 200
        assert detail.json()["state"] == "collecting_context"
        assert [item["text"] for item in detail.json()["messages"]] == ["Второй фрагмент"]

        delete_last = client.delete(
            f"/api/app/session/{session_id}/asset/{second_asset.json()['asset_id']}",
            headers=headers,
        )
        assert delete_last.status_code == 200
        assert delete_last.json()["remaining_items"] == 0
        assert delete_last.json()["context_preview"] == ""


def test_app_session_delete_assistant_message_updates_latest_payload(monkeypatch) -> None:
    init_db()
    with SessionLocal() as db:
        db.add(
            Order(
                email="delete-assistant@example.com",
                clickid="direct",
                mode="subscription",
                plan="sub_monthly",
                locale="ru",
                amount_minor=1999,
                currency="usd",
                status="paid",
                fulfillment_status="fulfilled",
                access_status="active",
            )
        )
        db.commit()

    monkeypatch.setattr(
        "app.services.openai_bot.OpenAIBotClient.generate_analyze_case",
        lambda self, prompt: {
            "diagnosis": "Первый диагноз.",
            "core_leverage": "Первый рычаг.",
            "plan_24h": ["Первый план на сутки с конкретным спокойным шагом."],
            "plan_if_reply": ["Первый план если ответит тепло и без давления."],
            "plan_if_no_reply": ["Первый план если не ответит в ближайшие дни."],
            "message_template": "Первый ответ ассистента.",
            "avoid_list": ["Первое избегать"],
        },
    )
    monkeypatch.setattr(
        "app.services.openai_bot.OpenAIBotClient.refine_analyze_case",
        lambda self, prompt: {
            "diagnosis": "Второй диагноз.",
            "core_leverage": "Второй рычаг.",
            "plan_24h": ["Второй план на сутки с конкретным спокойным шагом."],
            "plan_if_reply": ["Второй план если ответит тепло и без давления."],
            "plan_if_no_reply": ["Второй план если не ответит в ближайшие дни."],
            "message_template": "Второй ответ ассистента.",
            "avoid_list": ["Второе избегать"],
        },
    )

    with TestClient(app) as client:
        payload = _login_via_email_code(client, monkeypatch, "delete-assistant@example.com")
        headers = {"Authorization": f"Bearer {payload['tokens']['access_token']}"}

        start = client.post("/api/app/session/start", json={"mode": "analyze_case"}, headers=headers)
        session_id = start.json()["session_id"]
        asset = client.post(f"/api/app/session/{session_id}/asset-text", json={"text": "Контекст"}, headers=headers)
        assert asset.status_code == 200
        assert client.post(f"/api/app/session/{session_id}/batch/close", headers=headers).status_code == 200
        confirm = client.post(f"/api/app/session/{session_id}/confirm-context", json={"action": "confirm:yes"}, headers=headers)
        assert confirm.status_code == 200
        assert client.post(f"/api/app/session/{session_id}/generate", json={}, headers=headers).status_code == 200
        assert client.post(f"/api/app/session/{session_id}/refine", json={"command": "Еще вариант"}, headers=headers).status_code == 200

        detail = client.get(f"/api/app/session/{session_id}", headers=headers)
        assistant_ids = [item["id"] for item in detail.json()["messages"] if item["kind"] == "assistant"]
        assert len(assistant_ids) == 2
        assert detail.json()["ui_payload"]["diagnosis"] == "Второй диагноз."

        delete_latest = client.delete(f"/api/app/session/{session_id}/message/{assistant_ids[-1]}", headers=headers)
        assert delete_latest.status_code == 200
        assert delete_latest.json()["ui_payload"]["diagnosis"] == "Первый диагноз."

        detail_after_latest = client.get(f"/api/app/session/{session_id}", headers=headers)
        assert [item["text"] for item in detail_after_latest.json()["messages"] if item["kind"] == "assistant"] == ["Первый ответ ассистента."]
        assert detail_after_latest.json()["ui_payload"]["diagnosis"] == "Первый диагноз."

        delete_last = client.delete(f"/api/app/session/{session_id}/message/{assistant_ids[0]}", headers=headers)
        assert delete_last.status_code == 200
        assert delete_last.json()["ui_payload"] is None
        assert delete_last.json()["state"] == "ready_to_generate"


def test_app_session_delete_asset_rejects_foreign_session(monkeypatch) -> None:
    init_db()
    with SessionLocal() as db:
        db.add(
            Order(
                email="owner1@example.com",
                clickid="direct",
                mode="subscription",
                plan="sub_monthly",
                locale="ru",
                amount_minor=1999,
                currency="usd",
                status="paid",
                fulfillment_status="fulfilled",
                access_status="active",
            )
        )
        db.add(
            Order(
                email="owner2@example.com",
                clickid="direct",
                mode="subscription",
                plan="sub_monthly",
                locale="ru",
                amount_minor=1999,
                currency="usd",
                status="paid",
                fulfillment_status="fulfilled",
                access_status="active",
            )
        )
        db.commit()

    with TestClient(app) as client:
        owner1 = _login_via_email_code(client, monkeypatch, "owner1@example.com")
        owner1_headers = {"Authorization": f"Bearer {owner1['tokens']['access_token']}"}
        owner2 = _login_via_email_code(client, monkeypatch, "owner2@example.com")
        owner2_headers = {"Authorization": f"Bearer {owner2['tokens']['access_token']}"}

        start = client.post("/api/app/session/start", json={"mode": "analyze_case"}, headers=owner1_headers)
        session_id = start.json()["session_id"]
        asset = client.post(
            f"/api/app/session/{session_id}/asset-text",
            json={"text": "Чужой фрагмент"},
            headers=owner1_headers,
        )
        assert asset.status_code == 200

        deleted = client.delete(
            f"/api/app/session/{session_id}/asset/{asset.json()['asset_id']}",
            headers=owner2_headers,
        )
        assert deleted.status_code == 403


def test_app_session_delete_asset_rejects_closed_session(monkeypatch) -> None:
    init_db()
    with SessionLocal() as db:
        db.add(
            Order(
                email="delete-closed@example.com",
                clickid="direct",
                mode="subscription",
                plan="sub_monthly",
                locale="ru",
                amount_minor=1999,
                currency="usd",
                status="paid",
                fulfillment_status="fulfilled",
                access_status="active",
            )
        )
        db.commit()

    with TestClient(app) as client:
        payload = _login_via_email_code(client, monkeypatch, "delete-closed@example.com")
        headers = {"Authorization": f"Bearer {payload['tokens']['access_token']}"}

        start = client.post("/api/app/session/start", json={"mode": "analyze_case"}, headers=headers)
        session_id = start.json()["session_id"]
        asset = client.post(
            f"/api/app/session/{session_id}/asset-text",
            json={"text": "Нельзя удалить после reset"},
            headers=headers,
        )
        assert asset.status_code == 200

        closed = client.post(f"/api/app/session/{session_id}/reset", headers=headers)
        assert closed.status_code == 200

        deleted = client.delete(
            f"/api/app/session/{session_id}/asset/{asset.json()['asset_id']}",
            headers=headers,
        )
        assert deleted.status_code == 400
