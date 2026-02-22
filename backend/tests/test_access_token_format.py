from __future__ import annotations

import base64
import hashlib
import hmac
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))
from app.core.security import make_access_token, parse_access_token


def test_access_token_compact_for_telegram_limit() -> None:
    token_id = "123e4567-e89b-12d3-a456-426614174000"
    token = make_access_token(token_id, "secret")

    assert len(token) <= 64
    assert "_" in token
    assert "." not in token
    assert parse_access_token(token, "secret") == token_id


def test_access_token_legacy_format_is_still_supported() -> None:
    token_id = "123e4567-e89b-12d3-a456-426614174000"
    signature = hmac.new(b"secret", token_id.encode("utf-8"), hashlib.sha256).hexdigest()
    raw = f"{token_id}.{signature}"
    legacy = base64.urlsafe_b64encode(raw.encode("utf-8")).decode("utf-8").rstrip("=")

    assert parse_access_token(legacy, "secret") == token_id
