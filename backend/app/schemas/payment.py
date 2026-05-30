from __future__ import annotations

from pydantic import BaseModel, Field


class CheckoutSessionRequest(BaseModel):
    mode: str = Field(pattern="^(one_time|subscription)$")
    plan: str = Field(min_length=1)
    email: str
    clickid: str = Field(min_length=1)
    locale: str | None = None
    telegram_chat_id: str | None = None
    promo_code: str | None = None
    brand: str | None = None
    landing_id: str | None = None
    entry_host: str | None = None
    entry_path: str | None = None


class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str
    order_id: str


class PaymentIntentRequest(BaseModel):
    plan: str = Field(min_length=1)
    email: str
    clickid: str = Field(min_length=1)
    locale: str | None = None
    telegram_chat_id: str | None = None
    promo_code: str | None = None
    brand: str | None = None
    landing_id: str | None = None
    entry_host: str | None = None
    entry_path: str | None = None


class PaymentIntentResponse(BaseModel):
    order_id: str
    client_secret: str
    customer_id: str
    publishable_key: str


class MoneyAmountResponse(BaseModel):
    amount_minor: int
    currency: str


class PublicPlanResponse(BaseModel):
    code: str
    headline: str
    billing_period: str
    interval_unit: str
    interval_count: int
    price: MoneyAmountResponse
    compare_at_price: MoneyAmountResponse | None = None
    per_day_price: MoneyAmountResponse | None = None
    compare_at_per_day_price: MoneyAmountResponse | None = None
    badge: str | None = None
    is_default: bool
    is_highlighted: bool


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
    access_link: str | None = None


class OrderStatusResponse(BaseModel):
    payment_status: str
    fulfillment_status: str
    access_status: str
    activation_link: str | None = None
    access_link: str | None = None


class MobiSlonEventRequest(BaseModel):
    status: str = Field(min_length=1, max_length=64)
    clickid: str = Field(min_length=1, max_length=256)
    session_id: str | None = Field(default=None, max_length=128)
    page_path: str | None = None
    tracking_params: dict[str, str] = Field(default_factory=dict)


class MobiSlonEventResponse(BaseModel):
    accepted: bool
    forwarded: bool


class BinomGaLinkRequest(BaseModel):
    clickid: str = Field(min_length=1, max_length=256)
    ga_client_id: str = Field(min_length=1, max_length=128)
    session_id: str | None = Field(default=None, max_length=128)
    page_path: str | None = None


class BinomGaLinkResponse(BaseModel):
    accepted: bool
    forwarded: bool


class SessionCurrencyRequest(BaseModel):
    locale: str | None = None


class SessionCurrencyResponse(BaseModel):
    currency: str
    locale: str


class SessionCreateRequest(BaseModel):
    locale: str | None = None
    currency: str | None = None
    clickid: str | None = None
    brand: str | None = None
    landing_id: str | None = None
    entry_host: str | None = None
    entry_path: str | None = None
    tracking_params: dict[str, str] = Field(default_factory=dict)
    answers: dict[str, str | int | list[str] | dict[str, str] | None] = Field(default_factory=dict)


class SessionCreateResponse(BaseModel):
    uuid: str


class SessionUpdateEmailRequest(BaseModel):
    uuid: str = Field(min_length=1)
    email: str = Field(min_length=3)


class SessionPlanDataRequest(BaseModel):
    uuid: str = Field(min_length=1)
    promo_code: str | None = None


class SessionPlanDataResponse(BaseModel):
    uuid: str
    locale: str
    currency: str
    email: str | None = None
    plans: list[PublicPlanResponse]


class SessionPaymentIntentRequest(BaseModel):
    uuid: str = Field(min_length=1)
    plan: str = Field(min_length=1)
    email: str = Field(min_length=3)
    clickid: str | None = None
    locale: str | None = None
    telegram_chat_id: str | None = None
    promo_code: str | None = None
    brand: str | None = None
    landing_id: str | None = None
    entry_host: str | None = None
    entry_path: str | None = None
