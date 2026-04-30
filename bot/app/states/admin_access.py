from __future__ import annotations

from aiogram.fsm.state import State, StatesGroup


class AdminAccessFlow(StatesGroup):
    waiting_grant_email = State()
    waiting_grant_expiry = State()
    waiting_revoke_email = State()
