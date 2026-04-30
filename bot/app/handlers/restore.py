from __future__ import annotations

import logging

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import Message

from app.client.backend_api import BackendApiClient
from app.states.restore import RestoreFlow
from app.utils.thinking import run_with_thinking, send_with_thinking

logger = logging.getLogger("quiz.bot")

router = Router(name="restore")


@router.message(Command("restore"))
async def restore_entry(message: Message, state: FSMContext) -> None:
    await state.set_state(RestoreFlow.waiting_email)
    await send_with_thinking(message, "Введите email, который использовали при оплате.")


@router.message(RestoreFlow.waiting_email, F.text, ~F.text.startswith("/"))
async def restore_email(message: Message, state: FSMContext, backend: BackendApiClient) -> None:
    email = message.text.strip()
    try:
        await run_with_thinking(message, lambda: backend.restore_request(email=email))
    except Exception as exc:  # noqa: BLE001
        logger.warning("bot_restore_request_failed", extra={"error": str(exc)})
        await state.clear()
        await send_with_thinking(message, "Не удалось запустить восстановление. Попробуйте позже.")
        return

    await state.update_data(email=email)
    await state.set_state(RestoreFlow.waiting_otp)
    await send_with_thinking(message, "Введите OTP-код восстановления.")


@router.message(RestoreFlow.waiting_otp, F.text, ~F.text.startswith("/"))
async def restore_otp(message: Message, state: FSMContext, backend: BackendApiClient) -> None:
    otp = message.text.strip()
    if len(otp) != 6 or not otp.isdigit():
        await send_with_thinking(message, "OTP должен содержать 6 цифр.")
        return

    data = await state.get_data()
    email = data.get("email")
    telegram_user_id = str(message.from_user.id) if message.from_user else ""
    if not email or not telegram_user_id:
        await state.clear()
        await send_with_thinking(message, "Сессия восстановления потеряна. Запустите /restore заново.")
        return

    try:
        payload = await run_with_thinking(
            message,
            lambda: backend.restore_confirm(email=email, otp=otp, telegram_user_id=telegram_user_id),
        )
    except Exception as exc:  # noqa: BLE001
        details = BackendApiClient.parse_error_message(exc)
        logger.warning("bot_restore_confirm_failed", extra={"error": details})
        await send_with_thinking(message, f"Восстановление не выполнено: {details}. Повторите /restore.")
        await state.clear()
        return

    await state.clear()
    if payload.get("access_granted"):
        await send_with_thinking(message, "Доступ восстановлен. Команды /advice и /reset снова доступны.")
        return
    await send_with_thinking(message, "Восстановление выполнено, но доступ не активирован. Используйте ссылку активации.")
