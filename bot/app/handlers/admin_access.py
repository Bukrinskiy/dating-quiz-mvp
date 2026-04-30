from __future__ import annotations

from datetime import date, datetime, time
import logging
import re
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
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_MOSCOW_TZ = ZoneInfo("Europe/Moscow")


def _is_admin(message: Message) -> bool:
    user_id = str(message.from_user.id) if message.from_user else ""
    return user_id in set(get_settings().admin_ids_list)


def _normalize_email(raw_email: str) -> str:
    return raw_email.strip().lower()


def _valid_email(raw_email: str) -> bool:
    return bool(_EMAIL_RE.match(_normalize_email(raw_email)))


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


@router.message(Command("grant_access"))
async def grant_access_entry(message: Message, state: FSMContext) -> None:
    if not await _ensure_admin_or_reject(message, state):
        return
    await state.clear()
    await state.set_state(AdminAccessFlow.waiting_grant_email)
    await send_with_thinking(message, "Введите email пользователя, которому нужно выдать доступ.")


@router.message(Command("revoke_access"))
async def revoke_access_entry(message: Message, state: FSMContext) -> None:
    if not await _ensure_admin_or_reject(message, state):
        return
    await state.clear()
    await state.set_state(AdminAccessFlow.waiting_revoke_email)
    await send_with_thinking(message, "Введите email пользователя, у которого нужно забрать ручной доступ.")


@router.message(StateFilter(AdminAccessFlow), F.text.startswith("/cancel"))
async def admin_access_cancel(message: Message, state: FSMContext) -> None:
    await state.clear()
    await send_with_thinking(message, "Админская операция отменена.")


@router.message(AdminAccessFlow.waiting_grant_email, F.text, ~F.text.startswith("/"))
async def grant_access_email(message: Message, state: FSMContext) -> None:
    if not await _ensure_admin_or_reject(message, state):
        return
    email = _normalize_email(message.text or "")
    if not _valid_email(email):
        await send_with_thinking(message, "Некорректный email. Введите адрес в формате user@example.com.")
        return
    await state.update_data(email=email)
    await state.set_state(AdminAccessFlow.waiting_grant_expiry)
    await send_with_thinking(message, "Введите дату окончания доступа в формате YYYY-MM-DD.")


@router.message(AdminAccessFlow.waiting_grant_expiry, F.text, ~F.text.startswith("/"))
async def grant_access_expiry(message: Message, state: FSMContext, backend: BackendApiClient) -> None:
    if not await _ensure_admin_or_reject(message, state):
        return
    expires_at = _parse_expiry_date(message.text or "")
    if expires_at is None:
        await send_with_thinking(message, "Некорректная дата. Используйте YYYY-MM-DD и не указывайте дату в прошлом.")
        return

    data = await state.get_data()
    email = str(data.get("email") or "").strip().lower()
    admin_user_id = str(message.from_user.id) if message.from_user else ""
    admin_username = message.from_user.username if message.from_user else None
    if not email or not admin_user_id:
        await state.clear()
        await send_with_thinking(message, "Сессия потеряна. Запустите /grant_access заново.")
        return

    try:
        payload = await run_with_thinking(
            message,
            lambda: backend.admin_grant_access(
                email=email,
                expires_at=expires_at.isoformat(),
                admin_telegram_user_id=admin_user_id,
                admin_telegram_username=admin_username,
            ),
        )
    except Exception as exc:  # noqa: BLE001
        details = BackendApiClient.parse_error_message(exc)
        logger.warning("bot_admin_grant_failed admin_user_id=%s email=%s detail=%s", admin_user_id, email, details)
        await state.clear()
        await send_with_thinking(message, f"Не удалось выдать доступ: {details}.")
        return

    await state.clear()
    expires_at_local = expires_at.astimezone(_MOSCOW_TZ).strftime("%Y-%m-%d %H:%M:%S MSK")
    await send_with_thinking(
        message,
        f"Ручной доступ выдан для {email} до {expires_at_local}. "
        f"Текущий статус: {payload.get('access_status') or 'unknown'}.",
    )


@router.message(AdminAccessFlow.waiting_revoke_email, F.text, ~F.text.startswith("/"))
async def revoke_access_email(message: Message, state: FSMContext, backend: BackendApiClient) -> None:
    if not await _ensure_admin_or_reject(message, state):
        return
    email = _normalize_email(message.text or "")
    if not _valid_email(email):
        await send_with_thinking(message, "Некорректный email. Введите адрес в формате user@example.com.")
        return

    admin_user_id = str(message.from_user.id) if message.from_user else ""
    admin_username = message.from_user.username if message.from_user else None
    try:
        payload = await run_with_thinking(
            message,
            lambda: backend.admin_revoke_access(
                email=email,
                admin_telegram_user_id=admin_user_id,
                admin_telegram_username=admin_username,
            ),
        )
    except Exception as exc:  # noqa: BLE001
        details = BackendApiClient.parse_error_message(exc)
        logger.warning("bot_admin_revoke_failed admin_user_id=%s email=%s detail=%s", admin_user_id, email, details)
        await state.clear()
        await send_with_thinking(message, f"Не удалось отозвать доступ: {details}.")
        return

    await state.clear()
    if payload.get("status") == "not_found":
        await send_with_thinking(message, f"Активный ручной доступ для {email} не найден.")
        return
    await send_with_thinking(
        message,
        f"Ручной доступ для {email} отозван. "
        f"Текущий статус после отзыва: {payload.get('access_status') or 'no_access'}.",
    )
