from __future__ import annotations

import logging
from urllib.parse import parse_qsl, unquote_plus, urlencode, urlparse, urlsplit, urlunsplit

from aiogram import Router
from aiogram.filters import CommandObject, CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message

from app.client.backend_api import BackendApiClient
from app.utils.thinking import run_with_thinking, send_with_thinking

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


def _pay_url_for_user(pay_url: str, telegram_user_id: str) -> str:
    if not telegram_user_id:
        return pay_url
    parsed = urlsplit(pay_url)
    query_params = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query_params["tg_chat_id"] = telegram_user_id
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode(query_params), parsed.fragment))


def _pay_keyboard(pay_url: str, telegram_user_id: str) -> InlineKeyboardMarkup | None:
    if not _is_telegram_button_url(pay_url):
        logger.warning("bot_pay_url_invalid_for_telegram url=%s", pay_url)
        return None
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text="Оплатить доступ", url=_pay_url_for_user(pay_url, telegram_user_id))]]
    )


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
            payload = await run_with_thinking(
                message,
                lambda: backend.activate_access(activation_token=token, telegram_user_id=telegram_user_id),
            )
            if payload.get("access_granted"):
                await send_with_thinking(message, "Доступ активирован. Команды /advice и /reset теперь доступны.")
                return
            logger.warning("bot_start_activate_denied user=%s payload=%s", telegram_user_id, str(payload)[:300])
            await send_with_thinking(message, "Не удалось активировать доступ. Используйте /restore.")
            return
        except Exception as exc:  # noqa: BLE001
            details = BackendApiClient.parse_error_message(exc)
            if details == "Activation token is not active":
                # Common case: user re-opens an already used deep-link. If account is already
                # bound and paid, show success instead of an error.
                try:
                    status = await run_with_thinking(message, lambda: backend.access_status(telegram_user_id))
                    if status.is_paid:
                        await send_with_thinking(
                            message,
                            "Доступ уже активирован для этого аккаунта. Команды /advice и /reset доступны.",
                        )
                        return
                except Exception as status_exc:  # noqa: BLE001
                    logger.warning("bot_start_status_check_failed user=%s error=%s", telegram_user_id, str(status_exc)[:300])
            logger.warning("bot_start_activation_failed user=%s detail=%s", telegram_user_id, details)
            await send_with_thinking(message, f"Не удалось активировать доступ: {details}. Используйте /restore.")
            return

    if telegram_user_id:
        try:
            status = await run_with_thinking(message, lambda: backend.access_status(telegram_user_id))
            if status.is_paid:
                await send_with_thinking(message, "У вас уже активный доступ. Команды /advice и /reset доступны.")
                return
            if status.access_status in {"token_issued", "pending"}:
                await send_with_thinking(
                    message,
                    "Доступ пока не активирован. Если покупка не завершена, оформите оплату. "
                    "Если уже оплачивали, используйте /restore.",
                    reply_markup=_pay_keyboard(pay_url, telegram_user_id),
                )
                return
            if status.access_status in {"expired", "revoked"}:
                await send_with_thinking(
                    message,
                    "Доступ истек или отозван. Оформите оплату заново или используйте /restore, если уже оплачивали.",
                    reply_markup=_pay_keyboard(pay_url, telegram_user_id),
                )
                return
            if status.access_status == "grace_period":
                await send_with_thinking(
                    message,
                    "У вас grace period: доступ временно активен. Команды /advice и /reset доступны.",
                )
                return
        except Exception as exc:  # noqa: BLE001
            logger.warning("bot_start_status_check_failed user=%s error=%s", telegram_user_id, str(exc)[:300])

    await send_with_thinking(
        message,
        "Привет! Чтобы получить доступ к консультациям, сначала оформите оплату. "
        "После оплаты откройте ссылку активации со страницы успеха. Если доступ потерян, используйте /restore.",
        reply_markup=_pay_keyboard(pay_url, telegram_user_id),
    )
