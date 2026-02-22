from __future__ import annotations

from collections.abc import Awaitable, Callable
import logging
from typing import Any
from urllib.parse import urlparse

from aiogram import BaseMiddleware
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, TelegramObject

from app.client.backend_api import BackendApiClient

logger = logging.getLogger("quiz.bot")


def _is_telegram_button_url(url: str) -> bool:
    value = url.strip()
    if not value:
        return False
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"}:
        return False
    host = (parsed.hostname or "").strip().lower()
    if not host or host == "localhost" or host.startswith("127.") or host == "::1":
        return False
    return True


class AccessGateMiddleware(BaseMiddleware):
    def __init__(self, *, backend: BackendApiClient, public_commands: set[str], pay_url: str) -> None:
        self._backend = backend
        self._public_commands = {cmd.lower() for cmd in public_commands}
        self._pay_url = pay_url

    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        if not isinstance(event, Message):
            return await handler(event, data)

        text = (event.text or "").strip()

        state = data.get("state")
        if state is not None:
            state_name = await state.get_state()
            if state_name and state_name.startswith("RestoreFlow:"):
                return await handler(event, data)

        command = ""
        if text.startswith("/"):
            command = text.split(maxsplit=1)[0].split("@", maxsplit=1)[0].lower()

        if command in self._public_commands:
            return await handler(event, data)

        telegram_user_id = str(event.from_user.id) if event.from_user else ""
        if not telegram_user_id:
            return await handler(event, data)

        try:
            status = await self._backend.access_status(telegram_user_id)
        except Exception as exc:  # noqa: BLE001
            logger.warning("bot_access_check_failed", extra={"error": str(exc)})
            await event.answer("Сервис временно недоступен, попробуйте еще раз через минуту.")
            return None

        if status.is_paid or status.access_status == "grace_period":
            return await handler(event, data)

        logger.info(
            "bot_access_denied user=%s command=%s access_status=%s is_paid=%s",
            telegram_user_id,
            command,
            status.access_status,
            status.is_paid,
        )
        keyboard: InlineKeyboardMarkup | None = None
        if _is_telegram_button_url(self._pay_url):
            keyboard = InlineKeyboardMarkup(
                inline_keyboard=[[InlineKeyboardButton(text="Оплатить доступ", url=self._pay_url)]]
            )
        else:
            logger.warning("bot_pay_url_invalid_for_telegram url=%s", self._pay_url)

        await event.answer(
            "Доступ к этой команде открыт только после оплаты и активации. "
            "Оплатите доступ и вернитесь в бот, затем используйте /restore при необходимости.",
            reply_markup=keyboard,
        )
        return None
