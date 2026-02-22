from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.bot import router as bot_router
from app.api.v1.payment import router as payment_router

api_router = APIRouter()
api_router.include_router(payment_router)
api_router.include_router(bot_router)
