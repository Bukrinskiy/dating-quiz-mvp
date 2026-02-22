from __future__ import annotations

import asyncio
from dataclasses import dataclass
import json
import logging
import uuid

import httpx

logger = logging.getLogger("quiz.bot")


@dataclass
class AccessStatus:
    is_paid: bool
    order_id: str | None
    plan: str | None
    access_status: str | None


class BackendApiClient:
    def __init__(self, *, base_url: str, internal_token: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._internal_token = internal_token
        self._client = httpx.AsyncClient(timeout=10.0)

    async def close(self) -> None:
        await self._client.aclose()

    async def _request(self, method: str, path: str, payload: dict[str, str]) -> dict:
        headers = {
            "X-Internal-Token": self._internal_token,
            "X-Correlation-Id": str(uuid.uuid4()),
        }

        last_error: Exception | None = None
        for attempt in range(1, 4):
            try:
                logger.info(
                    "bot_backend_request method=%s path=%s attempt=%d correlation_id=%s",
                    method,
                    path,
                    attempt,
                    headers["X-Correlation-Id"],
                )
                response = await self._client.request(method, f"{self._base_url}{path}", json=payload, headers=headers)
                response.raise_for_status()
                logger.info(
                    "bot_backend_response method=%s path=%s status=%d correlation_id=%s",
                    method,
                    path,
                    response.status_code,
                    headers["X-Correlation-Id"],
                )
                return response.json()
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                logger.warning(
                    "bot_backend_request_failed method=%s path=%s attempt=%d correlation_id=%s error=%s",
                    method,
                    path,
                    attempt,
                    headers["X-Correlation-Id"],
                    str(exc)[:300],
                )
                if attempt == 3:
                    raise
                await asyncio.sleep(0.35 * attempt)

        raise RuntimeError("unreachable") from last_error

    @staticmethod
    def parse_error_message(exc: Exception) -> str:
        if isinstance(exc, httpx.HTTPStatusError):
            response = exc.response
            detail = ""
            try:
                body = response.json()
                detail = str(body.get("detail", ""))
            except json.JSONDecodeError:
                detail = response.text.strip()

            if detail:
                return detail
            return f"HTTP {response.status_code}"
        return "Service unavailable"

    async def access_status(self, telegram_user_id: str) -> AccessStatus:
        payload = await self._request("POST", "/api/bot/access/status", {"telegram_user_id": telegram_user_id})
        return AccessStatus(
            is_paid=bool(payload.get("is_paid", False)),
            order_id=payload.get("order_id"),
            plan=payload.get("plan"),
            access_status=payload.get("access_status"),
        )

    async def activate_access(self, *, activation_token: str, telegram_user_id: str) -> dict:
        return await self._request(
            "POST",
            "/api/bot/access/activate",
            {"activation_token": activation_token, "telegram_user_id": telegram_user_id},
        )

    async def restore_request(self, *, email: str) -> dict:
        return await self._request("POST", "/api/bot/restore/request", {"email": email})

    async def restore_confirm(self, *, email: str, otp: str, telegram_user_id: str) -> dict:
        return await self._request(
            "POST",
            "/api/bot/restore/confirm",
            {"email": email, "otp": otp, "telegram_user_id": telegram_user_id},
        )
