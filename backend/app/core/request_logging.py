from __future__ import annotations

from collections.abc import Mapping
import json
import logging
import uuid

from sqlalchemy.orm import Session

from app.core.db.session import SessionLocal
from app.core.models.payment import HttpRequestLog, MobiSlonRequestLog

logger = logging.getLogger("quiz.request_logging")

MOBI_SLON_PATHS = frozenset({"/api/events/mobi-slon", "/api/tracking/mobi-slon-event"})


def generate_request_id() -> str:
    return uuid.uuid4().hex


def should_log_http_request(path: str) -> bool:
    if path == "/" or path == "/health":
        return True
    if path.startswith("/api/bot/"):
        return False
    return path.startswith("/api/payment/") or path.startswith("/api/tracking/") or path in MOBI_SLON_PATHS


def is_mobi_slon_path(path: str) -> bool:
    return path in MOBI_SLON_PATHS


def headers_to_dict(headers: Mapping[str, str]) -> dict[str, str]:
    return {key: value for key, value in headers.items()}


def decode_body(raw_body: bytes | None) -> str | None:
    if raw_body is None:
        return None
    return raw_body.decode("utf-8", errors="replace")


def safe_jsonable(value: object) -> object:
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool, list, dict)):
        return value
    if isinstance(value, tuple):
        return list(value)
    try:
        json.dumps(value)
        return value
    except TypeError:
        if isinstance(value, Mapping):
            return {str(key): safe_jsonable(item) for key, item in value.items()}
        return str(value)


def extract_mobi_request_context(
    *,
    method: str,
    query_params: Mapping[str, str],
    raw_body: bytes | None,
) -> dict[str, object]:
    payload: dict[str, object] = {}
    if method == "GET":
        tracking_params = {key: value for key, value in query_params.items() if key not in {"status", "clickid", "session_id", "page_path"}}
        payload["status"] = query_params.get("status")
        payload["clickid"] = query_params.get("clickid")
        payload["session_id"] = query_params.get("session_id")
        payload["page_path"] = query_params.get("page_path")
        payload["tracking_params"] = tracking_params
        return payload

    if not raw_body:
        payload["tracking_params"] = {}
        return payload

    try:
        decoded = json.loads(raw_body.decode("utf-8", errors="replace"))
    except json.JSONDecodeError:
        payload["tracking_params"] = {}
        return payload

    if isinstance(decoded, dict):
        payload["status"] = decoded.get("status")
        payload["clickid"] = decoded.get("clickid")
        payload["session_id"] = decoded.get("session_id")
        payload["page_path"] = decoded.get("page_path")
        payload["tracking_params"] = safe_jsonable(decoded.get("tracking_params") or {})
    else:
        payload["tracking_params"] = {}
    return payload


def write_http_request_log(**payload: object) -> None:
    _write_log(HttpRequestLog(**payload))


def write_mobi_slon_request_log(**payload: object) -> None:
    _write_log(MobiSlonRequestLog(**payload))


def _write_log(record: HttpRequestLog | MobiSlonRequestLog) -> None:
    db: Session = SessionLocal()
    try:
        db.add(record)
        db.commit()
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        logger.warning("db_request_log_write_failed model=%s error=%s", record.__class__.__name__, exc)
    finally:
        db.close()
