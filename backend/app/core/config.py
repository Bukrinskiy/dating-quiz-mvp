from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


@dataclass(frozen=True)
class PlanConfig:
    code: str
    amount_minor: int
    currency: str
    product_name: str
    interval: str | None = None
    interval_count: int = 1
    headline: str | None = None
    badge: str | None = None
    compare_at_amount_minor: int | None = None
    per_day_amount_minor: int | None = None
    compare_at_per_day_amount_minor: int | None = None
    is_default: bool = False
    is_highlighted: bool = False
    sort_order: int = 0


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_base_url: str = "http://localhost:8080"
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    pay_success_url: str | None = None
    pay_cancel_url: str | None = None
    pay_portal_return_url: str | None = None
    database_url: str | None = None
    postgres_db: str = "dating_quiz"
    postgres_user: str = "dating_quiz"
    postgres_password: str = "dating_quiz"
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    access_token_secret: str = "dev-access-secret"
    telegram_bot_token: str = ""
    telegram_bot_username: str = ""
    email_delivery_mode: str = "log_only"
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_use_tls: bool = True
    smtp_login: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_timeout_seconds: int = 15
    log_otp_in_nonprod: bool = True
    otp_ttl_seconds: int = 600
    restore_rate_limit_per_hour: int = 5
    bot_internal_token: str = ""
    subscription_grace_period_seconds: int = 0
    meta_pixel_id: str = ""
    meta_access_token: str = ""
    meta_graph_api_version: str = "v18.0"
    mobi_slon_postback_url: str = Field(default="", validation_alias="VITE_MOBI_SLON_URL")

    openai_api_base: str = "https://api.openai.com/v1"
    openai_api_key: str = ""
    bot_openai_model_generate: str = "gpt-5.2"
    bot_openai_model_stt: str = "gpt-4o-transcribe"
    bot_media_max_bytes: int = 5_242_880
    bot_openai_timeout_seconds: int = 30
    bot_openai_retries: int = 2

    pay_one_time_basic_amount_minor: int = 999
    pay_one_time_basic_currency: str = "usd"
    pay_one_time_basic_product_name: str = "Seranking Premium"

    pay_sub_weekly_amount_minor: int = 399
    pay_sub_weekly_currency: str = "usd"
    pay_sub_weekly_interval: str = "week"
    pay_sub_weekly_interval_count: int = 1
    pay_sub_weekly_product_name: str = "Seranking Premium Weekly"
    pay_sub_weekly_headline: str = "Weekly plan"
    pay_sub_weekly_badge: str = "PROMO"
    pay_sub_weekly_compare_at_amount_minor: int = 1999
    pay_sub_weekly_per_day_amount_minor: int = 57
    pay_sub_weekly_compare_at_per_day_amount_minor: int = 285
    pay_sub_weekly_is_default: bool = False
    pay_sub_weekly_is_highlighted: bool = False
    pay_sub_weekly_sort_order: int = 30

    pay_sub_monthly_amount_minor: int = 6900
    pay_sub_monthly_currency: str = "usd"
    pay_sub_monthly_interval: str = "month"
    pay_sub_monthly_interval_count: int = 1
    pay_sub_monthly_product_name: str = "Seranking Premium Monthly"
    pay_sub_monthly_headline: str = "Monthly plan"
    pay_sub_monthly_badge: str = "Most popular"
    pay_sub_monthly_compare_at_amount_minor: int = 0
    pay_sub_monthly_per_day_amount_minor: int = 230
    pay_sub_monthly_compare_at_per_day_amount_minor: int = 0
    pay_sub_monthly_is_default: bool = True
    pay_sub_monthly_is_highlighted: bool = True
    pay_sub_monthly_sort_order: int = 20

    pay_sub_quarterly_amount_minor: int = 14900
    pay_sub_quarterly_currency: str = "usd"
    pay_sub_quarterly_interval: str = "month"
    pay_sub_quarterly_interval_count: int = 3
    pay_sub_quarterly_product_name: str = "Seranking Premium Quarterly"
    pay_sub_quarterly_headline: str = "Quarterly plan"
    pay_sub_quarterly_badge: str = ""
    pay_sub_quarterly_compare_at_amount_minor: int = 0
    pay_sub_quarterly_per_day_amount_minor: int = 166
    pay_sub_quarterly_compare_at_per_day_amount_minor: int = 0
    pay_sub_quarterly_is_default: bool = False
    pay_sub_quarterly_is_highlighted: bool = False
    pay_sub_quarterly_sort_order: int = 10

    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def resolved_pay_success_url(self) -> str:
        return self.pay_success_url or f"{self.app_base_url}/pay/success"

    @property
    def resolved_pay_cancel_url(self) -> str:
        return self.pay_cancel_url or f"{self.app_base_url}/pay/cancel"

    @property
    def resolved_pay_portal_return_url(self) -> str:
        return self.pay_portal_return_url or f"{self.app_base_url}/pay/manage"

    @property
    def plan_one_time_basic(self) -> PlanConfig:
        return PlanConfig(
            code="one_time_basic",
            amount_minor=self.pay_one_time_basic_amount_minor,
            currency=self.pay_one_time_basic_currency,
            product_name=self.pay_one_time_basic_product_name,
        )

    @property
    def plan_sub_weekly(self) -> PlanConfig:
        return PlanConfig(
            code="sub_weekly",
            amount_minor=self.pay_sub_weekly_amount_minor,
            currency=self.pay_sub_weekly_currency,
            product_name=self.pay_sub_weekly_product_name,
            interval=self.pay_sub_weekly_interval,
            interval_count=self.pay_sub_weekly_interval_count,
            headline=self.pay_sub_weekly_headline.strip() or None,
            badge=self.pay_sub_weekly_badge.strip() or None,
            compare_at_amount_minor=self.pay_sub_weekly_compare_at_amount_minor or None,
            per_day_amount_minor=self.pay_sub_weekly_per_day_amount_minor or None,
            compare_at_per_day_amount_minor=self.pay_sub_weekly_compare_at_per_day_amount_minor or None,
            is_default=self.pay_sub_weekly_is_default,
            is_highlighted=self.pay_sub_weekly_is_highlighted,
            sort_order=self.pay_sub_weekly_sort_order,
        )

    @property
    def plan_sub_monthly(self) -> PlanConfig:
        return PlanConfig(
            code="sub_monthly",
            amount_minor=self.pay_sub_monthly_amount_minor,
            currency=self.pay_sub_monthly_currency,
            product_name=self.pay_sub_monthly_product_name,
            interval=self.pay_sub_monthly_interval,
            interval_count=self.pay_sub_monthly_interval_count,
            headline=self.pay_sub_monthly_headline.strip() or None,
            badge=self.pay_sub_monthly_badge.strip() or None,
            compare_at_amount_minor=self.pay_sub_monthly_compare_at_amount_minor or None,
            per_day_amount_minor=self.pay_sub_monthly_per_day_amount_minor or None,
            compare_at_per_day_amount_minor=self.pay_sub_monthly_compare_at_per_day_amount_minor or None,
            is_default=self.pay_sub_monthly_is_default,
            is_highlighted=self.pay_sub_monthly_is_highlighted,
            sort_order=self.pay_sub_monthly_sort_order,
        )

    @property
    def plan_sub_quarterly(self) -> PlanConfig:
        return PlanConfig(
            code="sub_quarterly",
            amount_minor=self.pay_sub_quarterly_amount_minor,
            currency=self.pay_sub_quarterly_currency,
            product_name=self.pay_sub_quarterly_product_name,
            interval=self.pay_sub_quarterly_interval,
            interval_count=self.pay_sub_quarterly_interval_count,
            headline=self.pay_sub_quarterly_headline.strip() or None,
            badge=self.pay_sub_quarterly_badge.strip() or None,
            compare_at_amount_minor=self.pay_sub_quarterly_compare_at_amount_minor or None,
            per_day_amount_minor=self.pay_sub_quarterly_per_day_amount_minor or None,
            compare_at_per_day_amount_minor=self.pay_sub_quarterly_compare_at_per_day_amount_minor or None,
            is_default=self.pay_sub_quarterly_is_default,
            is_highlighted=self.pay_sub_quarterly_is_highlighted,
            sort_order=self.pay_sub_quarterly_sort_order,
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


def get_subscription_plan_catalog(settings: Settings) -> list[PlanConfig]:
    plans = [
        settings.plan_sub_weekly,
        settings.plan_sub_monthly,
        settings.plan_sub_quarterly,
    ]
    default_count = sum(1 for plan in plans if plan.is_default)
    if default_count != 1:
        raise RuntimeError("Exactly one subscription plan must be marked as default")
    return sorted(plans, key=lambda plan: (plan.sort_order, plan.code))


def get_plan_map(settings: Settings) -> dict[str, PlanConfig]:
    plan_map = {
        "one_time_basic": settings.plan_one_time_basic,
        "sub_weekly": settings.plan_sub_weekly,
        "sub_monthly": settings.plan_sub_monthly,
        "sub_quarterly": settings.plan_sub_quarterly,
    }
    get_subscription_plan_catalog(settings)
    return plan_map
