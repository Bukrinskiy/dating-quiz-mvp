from __future__ import annotations

from email.message import EmailMessage
import logging
import smtplib
from urllib.parse import urlparse

import httpx

from app.core.config import Settings
from app.core.security import mask_email

logger = logging.getLogger("quiz.notifications")


class LogOnlyEmailSender:
    def send_access_email(self, *, email: str, order_id: str, activation_link: str, locale: str) -> None:
        # Keep payload safe: no plain token in logs, only masked link.
        masked_link = activation_link.split("start=")[0] + "start=***" if "start=" in activation_link else "***"
        logger.info(
            "email_delivery_skipped",
            extra={
                "order_id": order_id,
                "email": mask_email(email),
                "activation_link": masked_link,
                "locale": locale,
            },
        )

    def send_otp(self, *, email: str, otp: str, allow_plain_otp: bool, locale: str) -> None:
        payload: dict[str, str] = {"email": mask_email(email), "locale": locale}
        if allow_plain_otp:
            payload["otp"] = otp
        logger.info("otp_delivery_skipped", extra=payload)


class SmtpEmailSender:
    def __init__(self, settings: Settings) -> None:
        self._host = settings.smtp_host
        self._port = settings.smtp_port
        self._use_tls = settings.smtp_use_tls
        self._login = settings.smtp_login
        self._password = settings.smtp_password
        self._sender = settings.smtp_from_email or settings.smtp_login
        self._timeout = settings.smtp_timeout_seconds

    @staticmethod
    def _normalize_locale(locale: str | None) -> str:
        if not locale:
            return "en"
        return "ru" if locale.strip().lower().startswith("ru") else "en"

    def _send_message(self, *, recipient: str, subject: str, body: str) -> None:
        if not self._login or not self._password or not self._sender:
            raise RuntimeError("SMTP credentials are not fully configured")

        message = EmailMessage()
        message["From"] = self._sender
        message["To"] = recipient
        message["Subject"] = subject
        message.set_content(body)

        with smtplib.SMTP(self._host, self._port, timeout=self._timeout) as smtp:
            smtp.ehlo()
            if self._use_tls:
                smtp.starttls()
                smtp.ehlo()
            smtp.login(self._login, self._password)
            smtp.send_message(message)

    def send_access_email(self, *, email: str, order_id: str, activation_link: str, locale: str) -> None:
        normalized = self._normalize_locale(locale)
        if normalized == "ru":
            subject = "Seranking: активация доступа"
            body = (
                "Оплата подтверждена.\n\n"
                f"Заказ: {order_id}\n"
                f"Ссылка активации: {activation_link}\n\n"
                "Если это письмо отправлено не вам, просто игнорируйте его."
            )
        else:
            subject = "Seranking: access activation"
            body = (
                "Payment confirmed.\n\n"
                f"Order: {order_id}\n"
                f"Activation link: {activation_link}\n\n"
                "If you did not request this email, ignore it."
            )
        self._send_message(recipient=email, subject=subject, body=body)
        logger.info("email_delivery_sent", extra={"order_id": order_id, "email": mask_email(email), "locale": normalized})

    def send_otp(self, *, email: str, otp: str, allow_plain_otp: bool, locale: str) -> None:
        normalized = self._normalize_locale(locale)
        if normalized == "ru":
            subject = "Seranking: код восстановления"
            body = (
                "Ваш OTP-код восстановления:\n\n"
                f"{otp}\n\n"
                "Код одноразовый и скоро истечет."
            )
        else:
            subject = "Seranking: restore OTP"
            body = (
                "Your restore OTP code:\n\n"
                f"{otp}\n\n"
                "The code is one-time and expires soon."
            )
        self._send_message(recipient=email, subject=subject, body=body)
        log_payload: dict[str, str] = {"email": mask_email(email), "locale": normalized}
        if allow_plain_otp:
            log_payload["otp"] = otp
        logger.info("otp_delivery_sent", extra=log_payload)


def build_email_sender(settings: Settings) -> LogOnlyEmailSender | SmtpEmailSender:
    mode = settings.email_delivery_mode.strip().lower()
    if mode == "smtp":
        return SmtpEmailSender(settings)
    return LogOnlyEmailSender()


class TelegramSender:
    def __init__(self, settings: Settings) -> None:
        self._bot_token = settings.telegram_bot_token
        self._bot_username = self._normalize_bot_username(settings.telegram_bot_username)
        self._bot_username_resolve_attempted = False

    @staticmethod
    def _normalize_bot_username(raw_value: str | None) -> str:
        value = (raw_value or "").strip()
        if not value:
            return ""

        if value.startswith("http://") or value.startswith("https://"):
            parsed = urlparse(value)
            value = parsed.path.strip("/")

        if value.startswith("@"):
            value = value[1:]

        if "/" in value:
            value = value.split("/", 1)[0]

        return value.strip()

    def _resolve_bot_username(self) -> str:
        if self._bot_username:
            return self._bot_username
        if not self._bot_token or self._bot_username_resolve_attempted:
            return ""

        self._bot_username_resolve_attempted = True
        try:
            response = httpx.get(f"https://api.telegram.org/bot{self._bot_token}/getMe", timeout=10)
            response.raise_for_status()
            payload = response.json()
            username = self._normalize_bot_username(payload.get("result", {}).get("username"))
            if username:
                self._bot_username = username
                logger.info("telegram_bot_username_resolved", extra={"bot_username": username})
            return self._bot_username
        except Exception as exc:  # noqa: BLE001
            logger.warning("telegram_bot_username_resolve_failed", extra={"error": str(exc)})
            return ""

    def build_deep_link(self, token: str) -> str:
        bot_username = self._resolve_bot_username()
        if not bot_username:
            return ""
        return f"https://t.me/{bot_username}?start={token}"

    def send_activation_message(self, *, chat_id: str, token: str) -> bool:
        if not self._bot_token:
            logger.warning("telegram_send_skipped_missing_bot_token", extra={"chat_id": chat_id})
            return False

        deep_link = self.build_deep_link(token)
        if not deep_link:
            logger.warning("telegram_send_skipped_missing_bot_username", extra={"chat_id": chat_id})
            return False

        text = f"Оплата подтверждена. Активируй доступ: {deep_link}"
        url = f"https://api.telegram.org/bot{self._bot_token}/sendMessage"
        try:
            response = httpx.post(url, json={"chat_id": chat_id, "text": text}, timeout=10)
            if response.status_code >= 400:
                logger.warning(
                    "telegram_send_failed",
                    extra={"chat_id": chat_id, "status_code": response.status_code, "body": response.text[:200]},
                )
                return False
            return True
        except Exception as exc:
            logger.warning("telegram_send_failed", extra={"chat_id": chat_id, "error": str(exc)})
            return False
