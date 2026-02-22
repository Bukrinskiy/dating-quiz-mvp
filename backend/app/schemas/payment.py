from __future__ import annotations

from pydantic import BaseModel, Field


class CheckoutSessionRequest(BaseModel):
    mode: str = Field(pattern="^(one_time|subscription)$")
    plan: str = Field(min_length=1)
    email: str
    clickid: str = Field(min_length=1)
    locale: str | None = None
    telegram_chat_id: str | None = None


class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str
    order_id: str


class CustomerPortalRequest(BaseModel):
    email: str


class ActivateAccessRequest(BaseModel):
    activation_token: str = Field(min_length=1)
    telegram_user_id: str = Field(min_length=1)


class RestoreRequest(BaseModel):
    email: str


class RestoreConfirmRequest(BaseModel):
    email: str
    otp: str = Field(min_length=6, max_length=6)
    telegram_user_id: str | None = None


class SessionStatusResponse(BaseModel):
    payment_status: str
    fulfillment_status: str
    access_status: str
    activation_link: str | None = None


class MobiSlonEventRequest(BaseModel):
    status: str = Field(min_length=1, max_length=64)
    clickid: str = Field(min_length=1, max_length=256)
    session_id: str | None = Field(default=None, max_length=128)
    page_path: str | None = Field(default=None, max_length=512)
    tracking_params: dict[str, str] = Field(default_factory=dict)


class MobiSlonEventResponse(BaseModel):
    accepted: bool
    forwarded: bool
