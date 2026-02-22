from __future__ import annotations

from pydantic import BaseModel, Field


class BotAccessStatusRequest(BaseModel):
    telegram_user_id: str = Field(min_length=1)


class BotAccessStatusResponse(BaseModel):
    is_paid: bool
    order_id: str | None = None
    plan: str | None = None
    access_status: str | None = None


class BotActivateAccessRequest(BaseModel):
    activation_token: str = Field(min_length=1)
    telegram_user_id: str = Field(min_length=1)


class BotRestoreRequest(BaseModel):
    email: str


class BotRestoreConfirmRequest(BaseModel):
    email: str
    otp: str = Field(min_length=6, max_length=6)
    telegram_user_id: str = Field(min_length=1)
