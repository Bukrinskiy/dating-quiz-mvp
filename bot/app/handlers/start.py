from __future__ import annotations

import logging
from urllib.parse import unquote_plus
from urllib.parse import urlparse

from aiogram import Router
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message

from app.client.backend_api import BackendApiClient

logger = logging.getLogger("quiz.bot")

router = Router(name="start")


def _normalize_start_payload(raw_args: str | None) -> str:
    value = (raw_args or "").strip()
    if not value:
        return ""
    value = unquote_plus(value).strip()
    if value.startswith("start="):
        value = value.removeprefix("start=").strip()
    if "&" in value:
        value = value.split("&", 1)[0].strip()
    return value


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


def _pay_keyboard(pay_url: str) -> InlineKeyboardMarkup | None:
    if not _is_telegram_button_url(pay_url):
        logger.warning("bot_pay_url_invalid_for_telegram url=%s", pay_url)
        return None
    return InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="Оплатить доступ", url=pay_url)]])


@router.message(CommandStart())
async def start_handler(message: Message, command: CommandObject, backend: BackendApiClient, pay_url: str) -> None:
    raw_args = command.args if command else ""
    token = _normalize_start_payload(raw_args)
    telegram_user_id = str(message.from_user.id) if message.from_user else ""
    message_text = (message.text or "").strip()
    logger.info(
        "bot_start_received user=%s has_token=%s token_len=%d raw_args_len=%d text=%s",
        telegram_user_id,
        bool(token),
        len(token),
        len((raw_args or "").strip()),
        message_text[:180],
    )

    if token and telegram_user_id:
        try:
            logger.info(
                "bot_start_activate_call user=%s token_preview=%s",
                telegram_user_id,
                f"{token[:8]}...{token[-6:]}" if len(token) > 16 else token,
            )
            payload = await backend.activate_access(activation_token=token, telegram_user_id=telegram_user_id)
            if payload.get("access_granted"):
                await message.answer("Доступ активирован. Команда /premium теперь доступна.")
                return
            logger.warning("bot_start_activate_denied user=%s payload=%s", telegram_user_id, str(payload)[:300])
            await message.answer("Не удалось активировать доступ. Используйте /restore.")
            return
        except Exception as exc:  # noqa: BLE001
            details = BackendApiClient.parse_error_message(exc)
            if details == "Activation token is not active":
                # Common case: user re-opens an already used deep-link. If account is already
                # bound and paid, show success instead of an error.
                try:
                    status = await backend.access_status(telegram_user_id)
                    if status.is_paid:
                        await message.answer("Доступ уже активирован для этого аккаунта. Команда /premium доступна.")
                        return
                except Exception as status_exc:  # noqa: BLE001
                    logger.warning("bot_start_status_check_failed user=%s error=%s", telegram_user_id, str(status_exc)[:300])
            logger.warning("bot_start_activation_failed user=%s detail=%s", telegram_user_id, details)
            await message.answer(f"Не удалось активировать доступ: {details}. Используйте /restore.")
            return

    if telegram_user_id:
        try:
            status = await backend.access_status(telegram_user_id)
            if status.is_paid:
                await message.answer("У вас уже активный доступ. Команда /premium доступна.")
                return
            if status.access_status in {"token_issued", "pending"}:
                await message.answer(
                    "Доступ пока не активирован. Если покупка не завершена, оформите оплату. "
                    "Если уже оплачивали, используйте /restore.",
                    reply_markup=_pay_keyboard(pay_url),
                )
                return
            if status.access_status in {"expired", "revoked"}:
                await message.answer(
                    "Доступ истек или отозван. Оформите оплату заново или используйте /restore, если уже оплачивали.",
                    reply_markup=_pay_keyboard(pay_url),
                )
                return
            if status.access_status == "grace_period":
                await message.answer("У вас grace period: доступ временно активен. Команда /premium доступна.")
                return
        except Exception as exc:  # noqa: BLE001
            logger.warning("bot_start_status_check_failed user=%s error=%s", telegram_user_id, str(exc)[:300])

    await message.answer(
        "Привет! Чтобы получить доступ к /premium, сначала оформите оплату. "
        "После оплаты откройте ссылку активации со страницы успеха. Если доступ потерян, используйте /restore.",
        reply_markup=_pay_keyboard(pay_url),
    )


@router.message(Command("help"))
async def help_handler(message: Message) -> None:
    await message.answer("Доступные команды: /start, /restore, /premium")
