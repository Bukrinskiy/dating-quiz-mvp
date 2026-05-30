from __future__ import annotations

from aiogram.fsm.state import State, StatesGroup


class AdminAccessFlow(StatesGroup):
    waiting_promo_expiry = State()
