from __future__ import annotations

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message

router = Router(name="premium")


@router.message(Command("premium"))
async def premium_handler(message: Message) -> None:
    await message.answer("Премиум-доступ подтвержден. Здесь будет платный функционал.")
