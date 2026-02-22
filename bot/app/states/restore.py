from __future__ import annotations

from aiogram.fsm.state import State, StatesGroup


class RestoreFlow(StatesGroup):
    waiting_email = State()
    waiting_otp = State()
