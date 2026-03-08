from __future__ import annotations

from aiogram.fsm.state import State, StatesGroup


class AdviceFlow(StatesGroup):
    choosing_mode = State()
    collecting_context = State()
    awaiting_confirm_edit = State()
    awaiting_refinement = State()
    awaiting_refine_text = State()
