from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_EVEN
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _settings_env_files() -> tuple[str, ...]:
    backend_dir = Path(__file__).resolve().parents[2]
    repo_root = backend_dir.parent
    return (
        str(repo_root / ".env"),
        str(backend_dir / ".env"),
    )


@dataclass(frozen=True)
class PlanConfig:
    code: str
    amount_minor: int
    base_amount_minor: int
    currency: str
    product_name: str
    interval: str | None = None
    interval_count: int = 1
    headline: str | None = None
    badge: str | None = None
    discount_percent: int = 0
    compare_at_amount_minor: int | None = None
    per_day_amount_minor: int | None = None
    base_per_day_amount_minor: int | None = None
    compare_at_per_day_amount_minor: int | None = None
    is_default: bool = False
    is_highlighted: bool = False
    sort_order: int = 0


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_settings_env_files(), env_file_encoding="utf-8", extra="ignore")

    site_public_base_url: str = "http://localhost:5175"
    pay_public_base_url: str = "http://localhost:5176"
    app_public_base_url: str = "http://localhost:5177"
    api_public_base_url: str = "http://localhost:8000"
    backend_cors_allow_origins: str = "http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177"
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    database_url: str | None = None
    postgres_db: str = "dating_quiz"
    postgres_user: str = "dating_quiz"
    postgres_password: str = "dating_quiz"
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    access_token_secret: str = "dev-access-secret"
    app_auth_secret: str = "dev-app-auth-secret"
    app_auth_access_ttl_seconds: int = 900
    app_auth_refresh_ttl_seconds: int = 2_592_000
    app_auth_refresh_grace_seconds: int = 30
    app_auth_refresh_cookie_name: str = "flirto_app_refresh"
    app_auth_refresh_cookie_secure: bool = True
    app_auth_refresh_cookie_samesite: str = "lax"
    app_auth_refresh_cookie_domain: str | None = None
    app_auth_refresh_cookie_path: str = "/"
    telegram_bot_token: str = ""
    telegram_bot_username: str = ""
    bot_admin_ids: str = ""
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
    bot_pay_url: str = ""
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
    pay_one_time_basic_product_name: str = "Flirto Guru Premium"

    pay_sub_weekly_base_amount_minor: int = 2625
    pay_sub_weekly_discount_percent: int = 60
    pay_sub_weekly_currency: str = "usd"
    pay_sub_weekly_interval: str = "week"
    pay_sub_weekly_interval_count: int = 1
    pay_sub_weekly_product_name: str = "Flirto Guru Premium Weekly"
    pay_sub_weekly_headline: str = "Weekly plan"
    pay_sub_weekly_badge: str = "PROMO"
    pay_sub_weekly_base_per_day_amount_minor: int = 375
    pay_sub_weekly_is_default: bool = False
    pay_sub_weekly_is_highlighted: bool = False
    pay_sub_weekly_sort_order: int = 30

    pay_sub_monthly_base_amount_minor: int = 4998
    pay_sub_monthly_discount_percent: int = 60
    pay_sub_monthly_currency: str = "usd"
    pay_sub_monthly_interval: str = "month"
    pay_sub_monthly_interval_count: int = 1
    pay_sub_monthly_product_name: str = "Flirto Guru Premium Monthly"
    pay_sub_monthly_headline: str = "Monthly plan"
    pay_sub_monthly_badge: str = "Most popular"
    pay_sub_monthly_base_per_day_amount_minor: int = 160
    pay_sub_monthly_is_default: bool = True
    pay_sub_monthly_is_highlighted: bool = True
    pay_sub_monthly_sort_order: int = 20

    pay_sub_quarterly_base_amount_minor: int = 8748
    pay_sub_quarterly_discount_percent: int = 60
    pay_sub_quarterly_currency: str = "usd"
    pay_sub_quarterly_interval: str = "month"
    pay_sub_quarterly_interval_count: int = 3
    pay_sub_quarterly_product_name: str = "Flirto Guru Premium Quarterly"
    pay_sub_quarterly_headline: str = "Quarterly plan"
    pay_sub_quarterly_badge: str = ""
    pay_sub_quarterly_base_per_day_amount_minor: int = 95
    pay_sub_quarterly_is_default: bool = False
    pay_sub_quarterly_is_highlighted: bool = False
    pay_sub_quarterly_sort_order: int = 10

    pay_sub_yearly_base_amount_minor: int = 59600
    pay_sub_yearly_discount_percent: int = 0
    pay_sub_yearly_currency: str = "usd"
    pay_sub_yearly_interval: str = "month"
    pay_sub_yearly_interval_count: int = 12
    pay_sub_yearly_product_name: str = "Flirto Guru Premium Yearly"
    pay_sub_yearly_headline: str = "Yearly plan"
    pay_sub_yearly_badge: str = ""
    pay_sub_yearly_base_per_day_amount_minor: int = 166
    pay_sub_yearly_is_default: bool = False
    pay_sub_yearly_is_highlighted: bool = False
    pay_sub_yearly_sort_order: int = 10

    @staticmethod
    def _apply_discount_minor(base_amount_minor: int, discount_percent: int) -> int:
        percent = max(0, min(100, int(discount_percent)))
        discounted = (Decimal(base_amount_minor) * Decimal(100 - percent) / Decimal(100)).quantize(
            Decimal("1"),
            rounding=ROUND_HALF_EVEN,
        )
        return int(discounted)

    @staticmethod
    def _compare_at_amount(base_amount_minor: int, discount_percent: int) -> int | None:
        if discount_percent <= 0:
            return None
        return base_amount_minor

    @staticmethod
    def _interval_days(interval: str | None, interval_count: int) -> int | None:
        if not interval:
            return None
        safe_count = max(1, int(interval_count))
        normalized = interval.lower().strip()
        if normalized == "week":
            return 7 * safe_count
        if normalized == "month":
            return 30 * safe_count
        if normalized == "year":
            return 365 * safe_count
        return None

    @classmethod
    def _amount_from_per_day(cls, per_day_amount_minor: int, interval: str | None, interval_count: int) -> int | None:
        days = cls._interval_days(interval, interval_count)
        if days is None:
            return None
        return max(0, int(per_day_amount_minor)) * days

    @property
    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            f"postgresql+psycopg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @staticmethod
    def _join_public_url(base_url: str, path: str) -> str:
        normalized_base = (base_url or "").strip().rstrip("/")
        normalized_path = path if path.startswith("/") else f"/{path}"
        parsed = urlsplit(normalized_base)
        current_path = parsed.path.rstrip("/")
        return urlunsplit((parsed.scheme, parsed.netloc, f"{current_path}{normalized_path}", "", ""))

    @property
    def cors_allow_origins_list(self) -> list[str]:
        raw_values = [item.strip() for item in self.backend_cors_allow_origins.split(",")]
        return [item.rstrip("/") for item in raw_values if item.strip()]

    @staticmethod
    def normalize_public_locale(raw_locale: str | None) -> str:
        if not raw_locale:
            return "ru"
        locale = raw_locale.strip().lower()
        if locale.startswith("en"):
            return "en"
        return "ru"

    def build_pay_success_url(self, locale: str | None = None) -> str:
        return self._join_public_url(self.pay_public_base_url, f"/{self.normalize_public_locale(locale)}/pay/success")

    def build_pay_cancel_url(self, locale: str | None = None) -> str:
        return self._join_public_url(self.pay_public_base_url, f"/{self.normalize_public_locale(locale)}/pay/cancel")

    def build_pay_manage_url(self, locale: str | None = None) -> str:
        return self._join_public_url(self.pay_public_base_url, f"/{self.normalize_public_locale(locale)}/pay/manage")

    def build_app_url(self, path: str) -> str:
        return self._join_public_url(self.app_public_base_url, path)

    @property
    def resolved_bot_pay_url(self) -> str:
        configured = self.bot_pay_url.strip()
        if configured:
            return configured
        return self.build_pay_manage_url("ru")

    @property
    def admin_ids_list(self) -> list[str]:
        values = [item.strip() for item in self.bot_admin_ids.split(",")]
        return [item for item in values if item]

    @property
    def plan_one_time_basic(self) -> PlanConfig:
        return PlanConfig(
            code="one_time_basic",
            amount_minor=self.pay_one_time_basic_amount_minor,
            base_amount_minor=self.pay_one_time_basic_amount_minor,
            currency=self.pay_one_time_basic_currency,
            product_name=self.pay_one_time_basic_product_name,
        )

    @property
    def plan_sub_weekly(self) -> PlanConfig:
        base_amount_minor = self._amount_from_per_day(
            self.pay_sub_weekly_base_per_day_amount_minor,
            self.pay_sub_weekly_interval,
            self.pay_sub_weekly_interval_count,
        ) or self.pay_sub_weekly_base_amount_minor
        per_day_amount_minor = self._apply_discount_minor(
            self.pay_sub_weekly_base_per_day_amount_minor,
            self.pay_sub_weekly_discount_percent,
        )
        amount_minor = self._amount_from_per_day(
            per_day_amount_minor,
            self.pay_sub_weekly_interval,
            self.pay_sub_weekly_interval_count,
        ) or self._apply_discount_minor(base_amount_minor, self.pay_sub_weekly_discount_percent)
        return PlanConfig(
            code="sub_weekly",
            amount_minor=amount_minor,
            base_amount_minor=base_amount_minor,
            currency=self.pay_sub_weekly_currency,
            product_name=self.pay_sub_weekly_product_name,
            interval=self.pay_sub_weekly_interval,
            interval_count=self.pay_sub_weekly_interval_count,
            headline=self.pay_sub_weekly_headline.strip() or None,
            badge=self.pay_sub_weekly_badge.strip() or None,
            discount_percent=self.pay_sub_weekly_discount_percent,
            compare_at_amount_minor=self._compare_at_amount(base_amount_minor, self.pay_sub_weekly_discount_percent),
            per_day_amount_minor=per_day_amount_minor,
            base_per_day_amount_minor=self.pay_sub_weekly_base_per_day_amount_minor,
            compare_at_per_day_amount_minor=self._compare_at_amount(
                self.pay_sub_weekly_base_per_day_amount_minor,
                self.pay_sub_weekly_discount_percent,
            ),
            is_default=self.pay_sub_weekly_is_default,
            is_highlighted=self.pay_sub_weekly_is_highlighted,
            sort_order=self.pay_sub_weekly_sort_order,
        )

    @property
    def plan_sub_monthly(self) -> PlanConfig:
        base_amount_minor = self._amount_from_per_day(
            self.pay_sub_monthly_base_per_day_amount_minor,
            self.pay_sub_monthly_interval,
            self.pay_sub_monthly_interval_count,
        ) or self.pay_sub_monthly_base_amount_minor
        per_day_amount_minor = self._apply_discount_minor(
            self.pay_sub_monthly_base_per_day_amount_minor,
            self.pay_sub_monthly_discount_percent,
        )
        amount_minor = self._amount_from_per_day(
            per_day_amount_minor,
            self.pay_sub_monthly_interval,
            self.pay_sub_monthly_interval_count,
        ) or self._apply_discount_minor(base_amount_minor, self.pay_sub_monthly_discount_percent)
        return PlanConfig(
            code="sub_monthly",
            amount_minor=amount_minor,
            base_amount_minor=base_amount_minor,
            currency=self.pay_sub_monthly_currency,
            product_name=self.pay_sub_monthly_product_name,
            interval=self.pay_sub_monthly_interval,
            interval_count=self.pay_sub_monthly_interval_count,
            headline=self.pay_sub_monthly_headline.strip() or None,
            badge=self.pay_sub_monthly_badge.strip() or None,
            discount_percent=self.pay_sub_monthly_discount_percent,
            compare_at_amount_minor=self._compare_at_amount(base_amount_minor, self.pay_sub_monthly_discount_percent),
            per_day_amount_minor=per_day_amount_minor,
            base_per_day_amount_minor=self.pay_sub_monthly_base_per_day_amount_minor,
            compare_at_per_day_amount_minor=self._compare_at_amount(
                self.pay_sub_monthly_base_per_day_amount_minor,
                self.pay_sub_monthly_discount_percent,
            ),
            is_default=self.pay_sub_monthly_is_default,
            is_highlighted=self.pay_sub_monthly_is_highlighted,
            sort_order=self.pay_sub_monthly_sort_order,
        )

    @property
    def plan_sub_yearly(self) -> PlanConfig:
        base_amount_minor = self._amount_from_per_day(
            self.pay_sub_yearly_base_per_day_amount_minor,
            self.pay_sub_yearly_interval,
            self.pay_sub_yearly_interval_count,
        ) or self.pay_sub_yearly_base_amount_minor
        per_day_amount_minor = self._apply_discount_minor(
            self.pay_sub_yearly_base_per_day_amount_minor,
            self.pay_sub_yearly_discount_percent,
        )
        amount_minor = self._amount_from_per_day(
            per_day_amount_minor,
            self.pay_sub_yearly_interval,
            self.pay_sub_yearly_interval_count,
        ) or self._apply_discount_minor(base_amount_minor, self.pay_sub_yearly_discount_percent)
        return PlanConfig(
            code="sub_yearly",
            amount_minor=amount_minor,
            base_amount_minor=base_amount_minor,
            currency=self.pay_sub_yearly_currency,
            product_name=self.pay_sub_yearly_product_name,
            interval=self.pay_sub_yearly_interval,
            interval_count=self.pay_sub_yearly_interval_count,
            headline=self.pay_sub_yearly_headline.strip() or None,
            badge=self.pay_sub_yearly_badge.strip() or None,
            discount_percent=self.pay_sub_yearly_discount_percent,
            compare_at_amount_minor=self._compare_at_amount(base_amount_minor, self.pay_sub_yearly_discount_percent),
            per_day_amount_minor=per_day_amount_minor,
            base_per_day_amount_minor=self.pay_sub_yearly_base_per_day_amount_minor,
            compare_at_per_day_amount_minor=self._compare_at_amount(
                self.pay_sub_yearly_base_per_day_amount_minor,
                self.pay_sub_yearly_discount_percent,
            ),
            is_default=self.pay_sub_yearly_is_default,
            is_highlighted=self.pay_sub_yearly_is_highlighted,
            sort_order=self.pay_sub_yearly_sort_order,
        )

    @property
    def plan_sub_quarterly(self) -> PlanConfig:
        base_amount_minor = self._amount_from_per_day(
            self.pay_sub_quarterly_base_per_day_amount_minor,
            self.pay_sub_quarterly_interval,
            self.pay_sub_quarterly_interval_count,
        ) or self.pay_sub_quarterly_base_amount_minor
        per_day_amount_minor = self._apply_discount_minor(
            self.pay_sub_quarterly_base_per_day_amount_minor,
            self.pay_sub_quarterly_discount_percent,
        )
        amount_minor = self._amount_from_per_day(
            per_day_amount_minor,
            self.pay_sub_quarterly_interval,
            self.pay_sub_quarterly_interval_count,
        ) or self._apply_discount_minor(base_amount_minor, self.pay_sub_quarterly_discount_percent)
        return PlanConfig(
            code="sub_quarterly",
            amount_minor=amount_minor,
            base_amount_minor=base_amount_minor,
            currency=self.pay_sub_quarterly_currency,
            product_name=self.pay_sub_quarterly_product_name,
            interval=self.pay_sub_quarterly_interval,
            interval_count=self.pay_sub_quarterly_interval_count,
            headline=self.pay_sub_quarterly_headline.strip() or None,
            badge=self.pay_sub_quarterly_badge.strip() or None,
            discount_percent=self.pay_sub_quarterly_discount_percent,
            compare_at_amount_minor=self._compare_at_amount(base_amount_minor, self.pay_sub_quarterly_discount_percent),
            per_day_amount_minor=per_day_amount_minor,
            base_per_day_amount_minor=self.pay_sub_quarterly_base_per_day_amount_minor,
            compare_at_per_day_amount_minor=self._compare_at_amount(
                self.pay_sub_quarterly_base_per_day_amount_minor,
                self.pay_sub_quarterly_discount_percent,
            ),
            is_default=self.pay_sub_quarterly_is_default,
            is_highlighted=self.pay_sub_quarterly_is_highlighted,
            sort_order=self.pay_sub_quarterly_sort_order,
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


def get_subscription_plan_catalog(settings: Settings) -> list[PlanConfig]:
    plans = [
        settings.plan_sub_quarterly,
        settings.plan_sub_weekly,
        settings.plan_sub_monthly,
        settings.plan_sub_yearly,
    ]
    default_count = sum(1 for plan in plans if plan.is_default)
    if default_count != 1:
        raise RuntimeError("Exactly one subscription plan must be marked as default")
    return sorted(plans, key=lambda plan: (plan.sort_order, plan.code))


def get_plan_map(settings: Settings) -> dict[str, PlanConfig]:
    plan_map = {
        "one_time_basic": settings.plan_one_time_basic,
        "sub_quarterly": settings.plan_sub_quarterly,
        "sub_weekly": settings.plan_sub_weekly,
        "sub_monthly": settings.plan_sub_monthly,
        "sub_yearly": settings.plan_sub_yearly,
    }
    get_subscription_plan_catalog(settings)
    return plan_map
