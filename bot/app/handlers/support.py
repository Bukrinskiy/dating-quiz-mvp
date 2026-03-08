from __future__ import annotations

import logging
from typing import Final

from aiogram import F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import Message

from app.config import get_settings
from app.states.support import SupportFlow
from app.utils.thinking import send_with_thinking

logger = logging.getLogger("quiz.bot")

router = Router(name="support")
_PREVIEW_LIMIT: Final[int] = 240


def _build_support_header(message: Message) -> str:
    user = message.from_user
    user_id = str(user.id) if user else "unknown"
    username = f"@{user.username}" if user and user.username else "-"
    full_name = user.full_name if user else "-"
    chat_id = str(message.chat.id)
    text_preview = (message.text or message.caption or "").strip()
    preview = text_preview[:_PREVIEW_LIMIT] if text_preview else "(no text)"
    return (
        "Новое сообщение в /support\n"
        f"user_id: {user_id}\n"
        f"username: {username}\n"
        f"name: {full_name}\n"
        f"chat_id: {chat_id}\n"
        f"message_id: {message.message_id}\n"
        f"preview: {preview}"
    )


@router.message(Command("support"))
async def support_entry(message: Message, state: FSMContext) -> None:
    await state.set_state(SupportFlow.waiting_message)
    await send_with_thinking(
        message,
        "Напишите ваше сообщение в поддержку. Можно приложить скриншот/медиа. "
        "Следующее сообщение будет отправлено администраторам.",
    )


@router.message(SupportFlow.waiting_message, F.text.startswith("/cancel"))
async def support_cancel(message: Message, state: FSMContext) -> None:
    await state.clear()
    await send_with_thinking(message, "Обращение в поддержку отменено.")


@router.message(SupportFlow.waiting_message)
async def support_forward_to_admins(message: Message, state: FSMContext) -> None:
    settings = get_settings()
    admin_ids = settings.admin_ids_list
    if not admin_ids:
        await state.clear()
        await send_with_thinking(message, "Поддержка временно недоступна: администраторы не настроены.")
        return

    header = _build_support_header(message)
    delivered = 0
    for admin_id in admin_ids:
        try:
            await message.bot.send_message(chat_id=admin_id, text=header)
            await message.bot.copy_message(
                chat_id=admin_id,
                from_chat_id=message.chat.id,
                message_id=message.message_id,
            )
            delivered += 1
        except Exception as exc:  # noqa: BLE001
            logger.warning("support_forward_failed admin_id=%s error=%s", admin_id, str(exc)[:240])

    await state.clear()
    if delivered > 0:
        await send_with_thinking(message, "Сообщение отправлено в поддержку. Спасибо!")
        return
    await send_with_thinking(message, "Не удалось отправить сообщение в поддержку. Попробуйте позже.")
