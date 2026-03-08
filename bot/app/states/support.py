from __future__ import annotations

from aiogram.fsm.state import State, StatesGroup


class SupportFlow(StatesGroup):
    waiting_message = State()
