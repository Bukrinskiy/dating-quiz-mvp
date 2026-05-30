from __future__ import annotations

from datetime import date, datetime, time
import logging
from zoneinfo import ZoneInfo

from aiogram import F, Router
from aiogram.filters import Command, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.types import Message

from app.client.backend_api import BackendApiClient
from app.config import get_settings
from app.states.admin_access import AdminAccessFlow
from app.utils.thinking import run_with_thinking, send_with_thinking

logger = logging.getLogger("quiz.bot")
router = Router(name="admin_access")
_MOSCOW_TZ = ZoneInfo("Europe/Moscow")


def _is_admin(message: Message) -> bool:
    user_id = str(message.from_user.id) if message.from_user else ""
    return user_id in set(get_settings().admin_ids_list)


def _parse_expiry_date(raw_value: str) -> datetime | None:
    try:
        parsed_date = date.fromisoformat(raw_value.strip())
    except ValueError:
        return None
    today_moscow = datetime.now(_MOSCOW_TZ).date()
    if parsed_date < today_moscow:
        return None
    return datetime.combine(parsed_date, time(23, 59, 59), tzinfo=_MOSCOW_TZ).astimezone(ZoneInfo("UTC"))


async def _ensure_admin_or_reject(message: Message, state: FSMContext) -> bool:
    if _is_admin(message):
        return True
    await state.clear()
    await send_with_thinking(message, "Команда доступна только администраторам.")
    return False


@router.message(Command("create_promo_code"))
async def create_promo_code_entry(message: Message, state: FSMContext, backend: BackendApiClient) -> None:
    if not await _ensure_admin_or_reject(message, state):
        return
    await state.clear()
    admin_user_id = str(message.from_user.id) if message.from_user else ""
    admin_username = message.from_user.username if message.from_user else None
    try:
        payload = await run_with_thinking(
            message,
            lambda: backend.create_access_code(
                admin_telegram_user_id=admin_user_id,
                admin_telegram_username=admin_username,
            ),
        )
    except Exception as exc:  # noqa: BLE001
        details = BackendApiClient.parse_error_message(exc)
        logger.warning("bot_create_promo_code_failed admin_user_id=%s detail=%s", admin_user_id, details)
        await send_with_thinking(message, f"Не удалось создать промокод: {details}.")
        return

    expires_at = datetime.fromisoformat(str(payload["expires_at"])).astimezone(_MOSCOW_TZ).strftime("%Y-%m-%d %H:%M:%S MSK")
    await send_with_thinking(message, f"Промокод создан: {payload['code']}\nДействует до: {expires_at}.")


@router.message(Command("create_promo_code_until"))
async def create_promo_code_until_entry(message: Message, state: FSMContext) -> None:
    if not await _ensure_admin_or_reject(message, state):
        return
    await state.clear()
    await state.set_state(AdminAccessFlow.waiting_promo_expiry)
    await send_with_thinking(message, "Введите дату окончания промокода в формате YYYY-MM-DD.")


@router.message(StateFilter(AdminAccessFlow), F.text.startswith("/cancel"))
async def admin_access_cancel(message: Message, state: FSMContext) -> None:
    await state.clear()
    await send_with_thinking(message, "Админская операция отменена.")


@router.message(AdminAccessFlow.waiting_promo_expiry, F.text, ~F.text.startswith("/"))
async def create_promo_code_expiry(message: Message, state: FSMContext, backend: BackendApiClient) -> None:
    if not await _ensure_admin_or_reject(message, state):
        return
    expires_at = _parse_expiry_date(message.text or "")
    if expires_at is None:
        await send_with_thinking(message, "Некорректная дата. Используйте YYYY-MM-DD и не указывайте дату в прошлом.")
        return

    admin_user_id = str(message.from_user.id) if message.from_user else ""
    admin_username = message.from_user.username if message.from_user else None
    if not admin_user_id:
        await state.clear()
        await send_with_thinking(message, "Сессия потеряна. Запустите /create_promo_code_until заново.")
        return

    try:
        payload = await run_with_thinking(
            message,
            lambda: backend.create_access_code(
                admin_telegram_user_id=admin_user_id,
                admin_telegram_username=admin_username,
                expires_at=expires_at.isoformat(),
            ),
        )
    except Exception as exc:  # noqa: BLE001
        details = BackendApiClient.parse_error_message(exc)
        logger.warning("bot_create_promo_code_until_failed admin_user_id=%s detail=%s", admin_user_id, details)
        await state.clear()
        await send_with_thinking(message, f"Не удалось создать промокод: {details}.")
        return

    await state.clear()
    expires_at_local = expires_at.astimezone(_MOSCOW_TZ).strftime("%Y-%m-%d %H:%M:%S MSK")
    await send_with_thinking(message, f"Промокод создан: {payload['code']}\nДействует до: {expires_at_local}.")
