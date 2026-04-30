from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any

from aiogram import BaseMiddleware
from aiogram.fsm.context import FSMContext
from aiogram.types import Message, TelegramObject


class StateInterruptMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: dict[str, Any],
    ) -> Any:
        if not isinstance(event, Message):
            return await handler(event, data)

        text = (event.text or "").strip()
        if not text.startswith("/"):
            return await handler(event, data)

        state = data.get("state")
        if not isinstance(state, FSMContext):
            return await handler(event, data)

        state_name = await state.get_state()
        if not state_name:
            return await handler(event, data)

        command = text.split(maxsplit=1)[0].split("@", maxsplit=1)[0].lower()

        if state_name.startswith("RestoreFlow:"):
            await state.clear()
            return await handler(event, data)

        if state_name.startswith("SupportFlow:") and command != "/cancel":
            await state.clear()
            return await handler(event, data)

        if state_name.startswith("AdminAccessFlow:") and command != "/cancel":
            await state.clear()
            return await handler(event, data)

        return await handler(event, data)
