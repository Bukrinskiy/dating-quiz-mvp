from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from pathlib import Path
from types import SimpleNamespace
import sys
import time
from typing import Any

import pytest
from aiogram import Bot
from aiogram.types import Update

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.client.backend_api import AccessStatus
from app.handlers.admin_access import router as admin_access_router
from app.handlers.advice import router as advice_router
from app.handlers.restore import router as restore_router
from app.handlers.start import router as start_router
from app.handlers.support import router as support_router
from app.main import _build_dispatcher


@dataclass
class DummyBackend:
    restore_requests: list[str] = field(default_factory=list)
    restore_confirms: list[dict[str, str]] = field(default_factory=list)
    session_reset_calls: list[dict[str, str]] = field(default_factory=list)
    admin_grants: list[dict[str, str | None]] = field(default_factory=list)
    admin_revokes: list[dict[str, str | None]] = field(default_factory=list)

    async def access_status(self, telegram_user_id: str) -> AccessStatus:
        return AccessStatus(is_paid=True, order_id="ord-1", plan="pro", access_status="active")

    async def activate_access(self, *, activation_token: str, telegram_user_id: str) -> dict[str, Any]:
        raise AssertionError("activate_access should not be called in these tests")

    async def restore_request(self, *, email: str) -> dict[str, str]:
        self.restore_requests.append(email)
        return {"status": "otp_logged"}

    async def restore_confirm(self, *, email: str, otp: str, telegram_user_id: str) -> dict[str, bool]:
        self.restore_confirms.append({"email": email, "otp": otp, "telegram_user_id": telegram_user_id})
        return {"access_granted": True}

    async def session_start(self, *, telegram_user_id: str, mode: str) -> dict[str, str]:
        return {"session_id": "sess-1"}

    async def session_reset(self, *, session_id: str, telegram_user_id: str) -> dict[str, str]:
        self.session_reset_calls.append({"session_id": session_id, "telegram_user_id": telegram_user_id})
        return {"status": "reset"}

    async def session_reset_active(self, *, telegram_user_id: str) -> dict[str, int]:
        self.session_reset_calls.append({"session_id": "active", "telegram_user_id": telegram_user_id})
        return {"closed_sessions": 1}

    async def admin_grant_access(
        self,
        *,
        email: str,
        expires_at: str,
        admin_telegram_user_id: str,
        admin_telegram_username: str | None,
    ) -> dict[str, Any]:
        self.admin_grants.append(
            {
                "email": email,
                "expires_at": expires_at,
                "admin_telegram_user_id": admin_telegram_user_id,
                "admin_telegram_username": admin_telegram_username,
            }
        )
        return {"status": "granted", "access_status": "manual_active"}

    async def admin_revoke_access(
        self,
        *,
        email: str,
        admin_telegram_user_id: str,
        admin_telegram_username: str | None,
    ) -> dict[str, Any]:
        self.admin_revokes.append(
            {
                "email": email,
                "admin_telegram_user_id": admin_telegram_user_id,
                "admin_telegram_username": admin_telegram_username,
            }
        )
        if email == "missing@example.com":
            return {"status": "not_found", "access_status": None}
        return {"status": "revoked", "access_status": None}


@pytest.fixture
async def bot_env(monkeypatch: pytest.MonkeyPatch) -> AsyncIterator[tuple[Any, Bot, DummyBackend, list[dict[str, Any]]]]:
    backend = DummyBackend()
    sent_messages: list[dict[str, Any]] = []

    async def fake_send_with_thinking(message: Any, text: str, **kwargs: Any) -> Any:
        sent_messages.append({"text": text, "reply_markup": kwargs.get("reply_markup")})
        return message

    async def fake_run_with_thinking(message: Any, operation: Any, **kwargs: Any) -> Any:
        return await operation()

    async def fake_invalidate_chat_pending_ui(chat_id: int) -> None:
        return None

    monkeypatch.setattr("app.handlers.restore.send_with_thinking", fake_send_with_thinking)
    monkeypatch.setattr("app.handlers.restore.run_with_thinking", fake_run_with_thinking)
    monkeypatch.setattr("app.handlers.start.send_with_thinking", fake_send_with_thinking)
    monkeypatch.setattr("app.handlers.start.run_with_thinking", fake_run_with_thinking)
    monkeypatch.setattr("app.handlers.advice.send_with_thinking", fake_send_with_thinking)
    monkeypatch.setattr("app.handlers.advice.run_with_thinking", fake_run_with_thinking)
    monkeypatch.setattr("app.handlers.advice.invalidate_chat_pending_ui", fake_invalidate_chat_pending_ui)
    monkeypatch.setattr("app.handlers.support.send_with_thinking", fake_send_with_thinking)
    monkeypatch.setattr("app.handlers.admin_access.send_with_thinking", fake_send_with_thinking)
    monkeypatch.setattr("app.handlers.admin_access.run_with_thinking", fake_run_with_thinking)
    monkeypatch.setattr("app.middlewares.access_gate.send_with_thinking", fake_send_with_thinking)
    admin_settings = SimpleNamespace(admin_ids_list=["111", "222"])
    monkeypatch.setattr("app.handlers.admin_access.get_settings", lambda: admin_settings)
    monkeypatch.setattr("app.middlewares.access_gate.get_settings", lambda: admin_settings)

    dispatcher = await _build_dispatcher(backend=backend, public_commands={"/start", "/restore", "/support"}, pay_url="")
    bot = Bot(token="123456:TESTTOKEN")
    try:
        yield dispatcher, bot, backend, sent_messages
    finally:
        await dispatcher.storage.close()
        await bot.session.close()
        start_router._parent_router = None
        restore_router._parent_router = None
        support_router._parent_router = None
        admin_access_router._parent_router = None
        advice_router._parent_router = None


async def _feed_text(
    dispatcher: Any,
    bot: Bot,
    text: str,
    *,
    update_id: int,
    message_id: int = 1,
    user_id: int = 501,
    username: str | None = None,
) -> None:
    update = Update.model_validate(
        {
            "update_id": update_id,
            "message": {
                "message_id": message_id,
                "date": int(time.time()),
                "chat": {"id": 1001, "type": "private"},
                "from": {
                    "id": user_id,
                    "is_bot": False,
                    "first_name": "Tema",
                    "username": username,
                },
                "text": text,
            },
        }
    )
    await dispatcher.feed_update(bot, update)


@pytest.mark.asyncio
async def test_restore_waiting_otp_interrupts_to_advice(bot_env: tuple[Any, Bot, DummyBackend, list[dict[str, Any]]]) -> None:
    dispatcher, bot, backend, sent_messages = bot_env

    await _feed_text(dispatcher, bot, "/restore", update_id=1, message_id=1)
    await _feed_text(dispatcher, bot, "restore@example.com", update_id=2, message_id=2)
    await _feed_text(dispatcher, bot, "/advice", update_id=3, message_id=3)

    assert backend.restore_requests == ["restore@example.com"]
    assert backend.restore_confirms == []
    assert sent_messages[-1]["text"] == "Выберите режим консультации:"


@pytest.mark.asyncio
async def test_restore_waiting_otp_interrupts_to_reset(bot_env: tuple[Any, Bot, DummyBackend, list[dict[str, Any]]]) -> None:
    dispatcher, bot, backend, sent_messages = bot_env

    await _feed_text(dispatcher, bot, "/restore", update_id=1, message_id=1)
    await _feed_text(dispatcher, bot, "restore@example.com", update_id=2, message_id=2)
    await _feed_text(dispatcher, bot, "/reset", update_id=3, message_id=3)

    assert backend.restore_confirms == []
    assert backend.session_reset_calls[-1]["session_id"] == "active"
    assert sent_messages[-1]["text"] == "Активная сессия полностью сброшена. Для нового кейса используйте /advice."


@pytest.mark.asyncio
async def test_restore_waiting_otp_interrupts_to_start(bot_env: tuple[Any, Bot, DummyBackend, list[dict[str, Any]]]) -> None:
    dispatcher, bot, backend, sent_messages = bot_env

    await _feed_text(dispatcher, bot, "/restore", update_id=1, message_id=1)
    await _feed_text(dispatcher, bot, "restore@example.com", update_id=2, message_id=2)
    await _feed_text(dispatcher, bot, "/start", update_id=3, message_id=3)

    assert backend.restore_confirms == []
    assert sent_messages[-1]["text"] == "У вас уже активный доступ. Команды /advice и /reset доступны."


@pytest.mark.asyncio
async def test_restore_waiting_otp_keeps_non_command_validation(bot_env: tuple[Any, Bot, DummyBackend, list[dict[str, Any]]]) -> None:
    dispatcher, bot, backend, sent_messages = bot_env

    await _feed_text(dispatcher, bot, "/restore", update_id=1, message_id=1)
    await _feed_text(dispatcher, bot, "restore@example.com", update_id=2, message_id=2)
    await _feed_text(dispatcher, bot, "not-an-otp", update_id=3, message_id=3)

    assert backend.restore_confirms == []
    assert sent_messages[-1]["text"] == "OTP должен содержать 6 цифр."


@pytest.mark.asyncio
async def test_restore_waiting_otp_keeps_valid_otp(bot_env: tuple[Any, Bot, DummyBackend, list[dict[str, Any]]]) -> None:
    dispatcher, bot, backend, sent_messages = bot_env

    await _feed_text(dispatcher, bot, "/restore", update_id=1, message_id=1)
    await _feed_text(dispatcher, bot, "restore@example.com", update_id=2, message_id=2)
    await _feed_text(dispatcher, bot, "123456", update_id=3, message_id=3)

    assert backend.restore_confirms == [
        {"email": "restore@example.com", "otp": "123456", "telegram_user_id": "501"}
    ]
    assert sent_messages[-1]["text"] == "Доступ восстановлен. Команды /advice и /reset снова доступны."


@pytest.mark.asyncio
async def test_support_cancel_stays_local(bot_env: tuple[Any, Bot, DummyBackend, list[dict[str, Any]]]) -> None:
    dispatcher, bot, _backend, sent_messages = bot_env

    await _feed_text(dispatcher, bot, "/support", update_id=1, message_id=1)
    await _feed_text(dispatcher, bot, "/cancel", update_id=2, message_id=2)

    assert sent_messages[-1]["text"] == "Обращение в поддержку отменено."


@pytest.mark.asyncio
async def test_support_interrupts_to_advice(bot_env: tuple[Any, Bot, DummyBackend, list[dict[str, Any]]]) -> None:
    dispatcher, bot, _backend, sent_messages = bot_env

    await _feed_text(dispatcher, bot, "/support", update_id=1, message_id=1)
    await _feed_text(dispatcher, bot, "/advice", update_id=2, message_id=2)

    assert sent_messages[-1]["text"] == "Выберите режим консультации:"


@pytest.mark.asyncio
async def test_non_admin_cannot_use_grant_access(bot_env: tuple[Any, Bot, DummyBackend, list[dict[str, Any]]]) -> None:
    dispatcher, bot, backend, sent_messages = bot_env

    await _feed_text(dispatcher, bot, "/grant_access", update_id=1, message_id=1)

    assert backend.admin_grants == []
    assert sent_messages[-1]["text"] == "Команда доступна только администраторам."


@pytest.mark.asyncio
async def test_admin_grant_access_flow(bot_env: tuple[Any, Bot, DummyBackend, list[dict[str, Any]]]) -> None:
    dispatcher, bot, backend, sent_messages = bot_env

    await _feed_text(dispatcher, bot, "/grant_access", update_id=1, message_id=1, user_id=111, username="chief_admin")
    await _feed_text(dispatcher, bot, "manual@example.com", update_id=2, message_id=2, user_id=111, username="chief_admin")
    await _feed_text(dispatcher, bot, "2026-05-01", update_id=3, message_id=3, user_id=111, username="chief_admin")

    assert backend.admin_grants
    assert backend.admin_grants[-1]["email"] == "manual@example.com"
    assert backend.admin_grants[-1]["admin_telegram_user_id"] == "111"
    assert sent_messages[-1]["text"].startswith("Ручной доступ выдан для manual@example.com до 2026-05-01 23:59:59 MSK.")


@pytest.mark.asyncio
async def test_admin_grant_access_rejects_invalid_inputs(bot_env: tuple[Any, Bot, DummyBackend, list[dict[str, Any]]]) -> None:
    dispatcher, bot, backend, sent_messages = bot_env

    await _feed_text(dispatcher, bot, "/grant_access", update_id=1, message_id=1, user_id=111)
    await _feed_text(dispatcher, bot, "bad-email", update_id=2, message_id=2, user_id=111)
    assert backend.admin_grants == []
    assert sent_messages[-1]["text"] == "Некорректный email. Введите адрес в формате user@example.com."

    await _feed_text(dispatcher, bot, "good@example.com", update_id=3, message_id=3, user_id=111)
    await _feed_text(dispatcher, bot, "2020-01-01", update_id=4, message_id=4, user_id=111)
    assert backend.admin_grants == []
    assert sent_messages[-1]["text"] == "Некорректная дата. Используйте YYYY-MM-DD и не указывайте дату в прошлом."


@pytest.mark.asyncio
async def test_admin_revoke_access_flow(bot_env: tuple[Any, Bot, DummyBackend, list[dict[str, Any]]]) -> None:
    dispatcher, bot, backend, sent_messages = bot_env

    await _feed_text(dispatcher, bot, "/revoke_access", update_id=1, message_id=1, user_id=111, username="chief_admin")
    await _feed_text(dispatcher, bot, "manual@example.com", update_id=2, message_id=2, user_id=111, username="chief_admin")

    assert backend.admin_revokes
    assert backend.admin_revokes[-1]["email"] == "manual@example.com"
    assert sent_messages[-1]["text"] == "Ручной доступ для manual@example.com отозван. Текущий статус после отзыва: no_access."


@pytest.mark.asyncio
async def test_admin_revoke_access_not_found(bot_env: tuple[Any, Bot, DummyBackend, list[dict[str, Any]]]) -> None:
    dispatcher, bot, backend, sent_messages = bot_env

    await _feed_text(dispatcher, bot, "/revoke_access", update_id=1, message_id=1, user_id=111)
    await _feed_text(dispatcher, bot, "missing@example.com", update_id=2, message_id=2, user_id=111)

    assert backend.admin_revokes[-1]["email"] == "missing@example.com"
    assert sent_messages[-1]["text"] == "Активный ручной доступ для missing@example.com не найден."


@pytest.mark.asyncio
async def test_admin_flow_interrupts_to_start(bot_env: tuple[Any, Bot, DummyBackend, list[dict[str, Any]]]) -> None:
    dispatcher, bot, _backend, sent_messages = bot_env

    await _feed_text(dispatcher, bot, "/grant_access", update_id=1, message_id=1, user_id=111)
    await _feed_text(dispatcher, bot, "manual@example.com", update_id=2, message_id=2, user_id=111)
    await _feed_text(dispatcher, bot, "/start", update_id=3, message_id=3, user_id=111)

    assert sent_messages[-1]["text"] == "У вас уже активный доступ. Команды /advice и /reset доступны."
