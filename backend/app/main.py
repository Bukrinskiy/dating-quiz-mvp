from __future__ import annotations

from html import escape
import logging
import os
import traceback
from contextlib import asynccontextmanager
import time

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.api.router import api_router
from app.cli.run_migrations import run_migrations
from app.core.config import get_settings
from app.core.notifications import TelegramSender
from app.core.request_logging import (
    decode_body,
    extract_mobi_request_context,
    generate_request_id,
    headers_to_dict,
    is_mobi_slon_path,
    safe_jsonable,
    should_log_http_request,
    write_http_request_log,
    write_mobi_slon_request_log,
)


def _resolve_log_level() -> int:
    raw_level = os.getenv("APP_LOG_LEVEL", "INFO").upper()
    return getattr(logging, raw_level, logging.INFO)


def _configure_logging() -> None:
    level = _resolve_log_level()
    fmt = "%(asctime)s %(levelname)s %(name)s %(message)s"
    logging.basicConfig(level=level, format=fmt)
    logging.getLogger().setLevel(level)
    logging.getLogger("quiz").setLevel(level)


_configure_logging()
settings = get_settings()
admin_telegram_sender = TelegramSender(settings)


def _build_admin_alert_text(
    *,
    request_id: str,
    method: str,
    path: str,
    status_code: int,
    client_ip: str | None,
    query_string: str | None,
    error_class: str | None,
    message: str | None,
    code_excerpt: str | None,
) -> str:
    message_preview = escape(((message or "").strip()[:1200] or "-"), quote=False)
    query_preview = escape(((query_string or "").strip()[:400] or "-"), quote=False)
    error_label = error_class or "HTTPErrorResponse"
    code_preview = escape(((code_excerpt or "").strip()[:1200] or "-"), quote=False)
    return (
        "<b>Landing backend error</b>\n"
        f"request_id: <code>{request_id}</code>\n"
        f"method: <code>{escape(method, quote=False)}</code>\n"
        f"path: <code>{escape(path, quote=False)}</code>\n"
        f"status: <code>{status_code}</code>\n"
        f"error_class: <code>{escape(error_label, quote=False)}</code>\n"
        f"client_ip: <code>{escape(client_ip or '-', quote=False)}</code>\n"
        f"query: <code>{query_preview}</code>\n"
        f"message: {message_preview}\n"
        f"code:\n<pre>{code_preview}</pre>"
    )


def _send_admin_alert(
    *,
    request_id: str,
    method: str,
    path: str,
    status_code: int,
    client_ip: str | None,
    query_string: str | None,
    error_class: str | None,
    message: str | None,
    code_excerpt: str | None = None,
) -> None:
    if not should_log_http_request(path) or status_code < 400:
        return
    text = _build_admin_alert_text(
        request_id=request_id,
        method=method,
        path=path,
        status_code=status_code,
        client_ip=client_ip,
        query_string=query_string,
        error_class=error_class,
        message=message,
        code_excerpt=code_excerpt,
    )
    try:
        admin_telegram_sender.send_admin_alert(text=text)
    except Exception as exc:  # noqa: BLE001
        logging.getLogger("quiz.notifications").warning("telegram_admin_alert_failed error=%s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _configure_logging()
    logging.info("app_startup logging_configured level=%s", logging.getLevelName(_resolve_log_level()))
    run_migrations()
    _configure_logging()
    yield


app = FastAPI(title="quiz-backend", lifespan=lifespan, )
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
app.include_router(api_router)


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = generate_request_id()
    raw_body = await request.body()
    request.state.request_id = request_id
    request.state.raw_body = raw_body
    request.state.http_log_written = False

    async def receive() -> dict[str, object]:
        return {"type": "http.request", "body": raw_body, "more_body": False}

    request = Request(request.scope, receive)
    request.state.request_id = request_id
    request.state.raw_body = raw_body
    request.state.http_log_written = False

    started_at = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as exc:  # noqa: BLE001
        duration_ms = int((time.perf_counter() - started_at) * 1000)
        if should_log_http_request(request.url.path):
            write_http_request_log(
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                query_string=request.url.query or None,
                status_code=500,
                duration_ms=duration_ms,
                client_ip=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                request_headers=headers_to_dict(request.headers),
                request_body=decode_body(raw_body),
                response_headers={},
                response_body=None,
                error_class=exc.__class__.__name__,
                error_message=str(exc),
            )
            request.state.http_log_written = True
            _send_admin_alert(
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                status_code=500,
                client_ip=request.client.host if request.client else None,
                query_string=request.url.query or None,
                error_class=exc.__class__.__name__,
                message=str(exc),
                code_excerpt="".join(traceback.format_exception(exc)).strip(),
            )
        raise

    response_body = b""
    async for chunk in response.body_iterator:
        response_body += chunk

    duration_ms = int((time.perf_counter() - started_at) * 1000)
    rebuilt_response = Response(
        content=response_body,
        status_code=response.status_code,
        headers=dict(response.headers),
        media_type=response.media_type,
        background=response.background,
    )
    rebuilt_response.headers["X-Request-ID"] = request_id

    if should_log_http_request(request.url.path) and not getattr(request.state, "http_log_written", False):
        write_http_request_log(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            query_string=request.url.query or None,
            status_code=rebuilt_response.status_code,
            duration_ms=duration_ms,
            client_ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            request_headers=headers_to_dict(request.headers),
            request_body=decode_body(raw_body),
            response_headers=headers_to_dict(rebuilt_response.headers),
            response_body=decode_body(response_body),
            error_class=None,
            error_message=None,
        )
        request.state.http_log_written = True
        _send_admin_alert(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            status_code=rebuilt_response.status_code,
            client_ip=request.client.host if request.client else None,
            query_string=request.url.query or None,
            error_class=None,
            message=decode_body(response_body),
            code_excerpt=decode_body(response_body),
        )

    return rebuilt_response


@app.exception_handler(RequestValidationError)
async def request_validation_logging_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", generate_request_id())
    raw_body = decode_body(getattr(request.state, "raw_body", b""))
    response = await request_validation_exception_handler(request, exc)
    response.headers["X-Request-ID"] = request_id

    if should_log_http_request(request.url.path):
        write_http_request_log(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            query_string=request.url.query or None,
            status_code=response.status_code,
            duration_ms=0,
            client_ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
            request_headers=headers_to_dict(request.headers),
            request_body=raw_body,
            response_headers=headers_to_dict(response.headers),
            response_body=decode_body(response.body),
            error_class="RequestValidationError",
            error_message=str(exc),
        )
        request.state.http_log_written = True
        _send_admin_alert(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            client_ip=request.client.host if request.client else None,
            query_string=request.url.query or None,
            error_class="RequestValidationError",
            message=decode_body(response.body),
            code_excerpt=decode_body(response.body),
        )

    if is_mobi_slon_path(request.url.path):
        mobi_payload = extract_mobi_request_context(
            method=request.method,
            query_params=request.query_params,
            raw_body=getattr(request.state, "raw_body", b""),
        )
        write_mobi_slon_request_log(
            request_id=request_id,
            transport="post" if request.method == "POST" else "get_fallback",
            incoming_path=request.url.path,
            status=mobi_payload.get("status"),
            clickid=mobi_payload.get("clickid"),
            session_id=mobi_payload.get("session_id"),
            page_path=mobi_payload.get("page_path"),
            tracking_params=safe_jsonable(mobi_payload.get("tracking_params") or {}),
            request_headers=headers_to_dict(request.headers),
            raw_body=raw_body,
            validation_errors=safe_jsonable(exc.errors()),
            accepted=False,
            forwarded=False,
            error_class="RequestValidationError",
            error_message=str(exc),
        )

    return response


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
