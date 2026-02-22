from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class BotSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    telegram_bot_token: str = ""
    bot_mode: str = "polling"
    bot_port: int = 8081
    bot_internal_token: str = ""
    bot_backend_base_url: str = "http://backend:8000"
    bot_webhook_path_secret: str = ""
    app_public_base_url: str = ""
    bot_pay_url: str = ""
    bot_allowed_public_commands: str = "/start,/restore,/help"

    @property
    def normalized_mode(self) -> str:
        mode = self.bot_mode.strip().lower()
        if mode not in {"polling", "webhook"}:
            return "polling"
        return mode

    @property
    def webhook_internal_path(self) -> str:
        return f"/webhook/{self.bot_webhook_path_secret}"

    @property
    def webhook_public_url(self) -> str:
        base = self.app_public_base_url.rstrip("/")
        return f"{base}/tg/webhook/{self.bot_webhook_path_secret}"

    @property
    def allowed_public_commands_set(self) -> set[str]:
        commands = {cmd.strip().lower() for cmd in self.bot_allowed_public_commands.split(",") if cmd.strip()}
        return commands or {"/start", "/restore", "/help"}

    @property
    def pay_url(self) -> str:
        configured = self.bot_pay_url.strip()
        if configured:
            return configured
        base = self.app_public_base_url.rstrip("/")
        if not base:
            return ""
        return f"{base}/pay"

    def validate_required(self) -> None:
        if not self.telegram_bot_token:
            raise ValueError("TELEGRAM_BOT_TOKEN is required for bot service")
        if not self.bot_internal_token:
            raise ValueError("BOT_INTERNAL_TOKEN is required for bot service")
        if self.normalized_mode == "webhook":
            if not self.bot_webhook_path_secret:
                raise ValueError("BOT_WEBHOOK_PATH_SECRET is required for webhook mode")
            if not self.app_public_base_url:
                raise ValueError("APP_PUBLIC_BASE_URL is required for webhook mode")


@lru_cache(maxsize=1)
def get_settings() -> BotSettings:
    settings = BotSettings()
    settings.validate_required()
    return settings
