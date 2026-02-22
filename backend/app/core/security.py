from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def mask_email(email: str) -> str:
    if "@" not in email:
        return "***"
    local, domain = email.split("@", 1)
    if len(local) <= 2:
        return f"{local[0]}***@{domain}" if local else f"***@{domain}"
    return f"{local[:2]}***@{domain}"


def hash_value(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def make_access_token(token_id: str, secret: str) -> str:
    # Telegram deep-link payload for /start has a strict size limit (~64 chars).
    # Payload must contain only [A-Za-z0-9_-], so we cannot use "."
    # Use compact token format: <uuid_without_dashes>_<first_24_hex_of_hmac>
    token_compact = token_id.replace("-", "")
    signature = hmac.new(secret.encode("utf-8"), token_compact.encode("utf-8"), hashlib.sha256).hexdigest()[:24]
    return f"{token_compact}_{signature}"


def parse_access_token(token: str, secret: str) -> str | None:
    # New compact format for Telegram deep links.
    if "_" in token:
        token_id_compact, signature = token.split("_", 1)
        if len(token_id_compact) == 32 and len(signature) == 24:
            expected = hmac.new(secret.encode("utf-8"), token_id_compact.encode("utf-8"), hashlib.sha256).hexdigest()[:24]
            if hmac.compare_digest(signature, expected):
                return (
                    f"{token_id_compact[0:8]}-{token_id_compact[8:12]}-{token_id_compact[12:16]}-"
                    f"{token_id_compact[16:20]}-{token_id_compact[20:32]}"
                )

    # Backward compatibility: early compact format with "." separator.
    if "." in token:
        token_id_compact, signature = token.split(".", 1)
        if len(token_id_compact) == 32 and len(signature) == 24:
            expected = hmac.new(secret.encode("utf-8"), token_id_compact.encode("utf-8"), hashlib.sha256).hexdigest()[:24]
            if hmac.compare_digest(signature, expected):
                return (
                    f"{token_id_compact[0:8]}-{token_id_compact[8:12]}-{token_id_compact[12:16]}-"
                    f"{token_id_compact[16:20]}-{token_id_compact[20:32]}"
                )

    # Backward compatibility: legacy base64 format.
    padded = token + "=" * (-len(token) % 4)
    try:
        decoded = base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8")
    except Exception:
        return None

    if "." not in decoded:
        return None
    token_id, signature = decoded.split(".", 1)
    expected = hmac.new(secret.encode("utf-8"), token_id.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        return None
    return token_id
