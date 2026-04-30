from __future__ import annotations

import argparse
from datetime import datetime, UTC
import logging
from pathlib import Path
import sys

from app.core.config import Settings
from app.core.notifications import SmtpEmailSender
from app.core.security import mask_email


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Send a test email using SMTP settings from .env/.env.template-compatible environment.",
    )
    parser.add_argument("recipient", help="Recipient email address")
    parser.add_argument(
        "--subject",
        default="SMTP test email",
        help="Email subject",
    )
    parser.add_argument(
        "--message",
        default="This is a test email sent from dating-quiz-mvp.",
        help="Email body",
    )
    parser.add_argument(
        "--smtp-debug",
        action="store_true",
        help="Print low-level SMTP conversation to stderr",
    )
    return parser


def _repo_env_path() -> Path:
    return Path(__file__).resolve().parents[3] / ".env"


def _format_email_value(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        return "<empty>"
    return mask_email(normalized) if "@" in normalized else normalized


def main() -> int:
    args = _build_parser().parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    env_path = _repo_env_path()
    if not env_path.exists():
        print(f".env file not found: {env_path}", file=sys.stderr)
        return 1

    settings = Settings()
    password_present = bool(settings.smtp_password)
    password_length = len(settings.smtp_password)
    print(f"Using env file: {env_path}")
    print(f"SMTP_HOST={settings.smtp_host}")
    print(f"SMTP_PORT={settings.smtp_port}")
    print(f"SMTP_USE_TLS={settings.smtp_use_tls}")
    print(f"SMTP_LOGIN={_format_email_value(settings.smtp_login)}")
    print(f"SMTP_FROM_EMAIL={_format_email_value(settings.smtp_from_email)}")
    print(f"SMTP_PASSWORD_PRESENT={password_present}")
    print(f"SMTP_PASSWORD_LENGTH={password_length}")
    print(f"SMTP_PASSWORD={settings.smtp_password}")
    print(f"SMTP_DEBUG={args.smtp_debug}")

    sender = SmtpEmailSender(settings)
    timestamp = datetime.now(UTC).isoformat()
    body = (
        f"{args.message}\n\n"
        f"Timestamp (UTC): {timestamp}\n"
        f"SMTP host: {settings.smtp_host}:{settings.smtp_port}\n"
        f"TLS: {settings.smtp_use_tls}\n"
        f"From: {settings.smtp_from_email or settings.smtp_login}\n"
    )

    try:
        sender.send_test_email(email=args.recipient, subject=args.subject, body=body, smtp_debug=args.smtp_debug)
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to send test email: {exc}", file=sys.stderr)
        return 1

    print(f"Test email sent to {args.recipient}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
