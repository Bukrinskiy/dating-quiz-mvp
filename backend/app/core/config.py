from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


@dataclass(frozen=True)
class PlanConfig:
    amount_minor: int
    currency: str
    interval: str | None = None


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

    pay_one_time_basic_amount_minor: int = 999
    pay_one_time_basic_currency: str = "usd"
    pay_sub_monthly_amount_minor: int = 999
    pay_sub_monthly_currency: str = "usd"
    pay_sub_monthly_interval: str = "month"
    pay_one_time_basic_product_name: str = "Seranking Premium"
    pay_sub_monthly_product_name: str = "Seranking Premium Monthly"

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
            amount_minor=self.pay_one_time_basic_amount_minor,
            currency=self.pay_one_time_basic_currency,
        )

    @property
    def plan_sub_monthly(self) -> PlanConfig:
        return PlanConfig(
            amount_minor=self.pay_sub_monthly_amount_minor,
            currency=self.pay_sub_monthly_currency,
            interval=self.pay_sub_monthly_interval,
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


def get_plan_map(settings: Settings) -> dict[str, PlanConfig]:
    return {
        "one_time_basic": settings.plan_one_time_basic,
        "sub_monthly": settings.plan_sub_monthly,
    }
