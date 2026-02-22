from __future__ import annotations

import logging
import secrets

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.db.session import get_db
from app.core.security import mask_email
from app.schemas.bot import (
    BotAccessStatusRequest,
    BotAccessStatusResponse,
    BotActivateAccessRequest,
    BotRestoreConfirmRequest,
    BotRestoreRequest,
)
from app.services.payment_service import PaymentService

logger = logging.getLogger("quiz.bot_api")

router = APIRouter()


def _require_internal_token(
    x_internal_token: str | None = Header(default=None, alias="X-Internal-Token"),
    settings: Settings = Depends(get_settings),
) -> None:
    if not settings.bot_internal_token:
        raise HTTPException(status_code=503, detail="Bot internal auth is not configured")
    if not x_internal_token or not secrets.compare_digest(x_internal_token, settings.bot_internal_token):
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.post(
    "/api/bot/access/status",
    response_model=BotAccessStatusResponse,
    dependencies=[Depends(_require_internal_token)],
)
def bot_access_status(payload: BotAccessStatusRequest, db: Session = Depends(get_db)) -> BotAccessStatusResponse:
    service = PaymentService(get_settings(), db)
    status = service.get_access_status_by_telegram_user(payload.telegram_user_id)
    logger.info("bot_access_check", extra={"telegram_user_id": payload.telegram_user_id, "is_paid": status["is_paid"]})
    return BotAccessStatusResponse(**status)


@router.post(
    "/api/bot/access/activate",
    dependencies=[Depends(_require_internal_token)],
)
def bot_activate_access(payload: BotActivateAccessRequest, db: Session = Depends(get_db)) -> dict[str, str | bool]:
    service = PaymentService(get_settings(), db)
    token = payload.activation_token.strip()
    token_preview = f"{token[:8]}...{token[-6:]}" if len(token) > 16 else token
    logger.info(
        "bot_activation_attempt telegram_user_id=%s token_len=%d token_preview=%s",
        payload.telegram_user_id,
        len(token),
        token_preview,
    )
    result = service.activate_access(activation_token=token, telegram_user_id=payload.telegram_user_id)
    logger.info(
        "bot_activation_result telegram_user_id=%s access_granted=%s order_id=%s",
        payload.telegram_user_id,
        result.get("access_granted"),
        result.get("order_id"),
    )
    return result


@router.post(
    "/api/bot/restore/request",
    dependencies=[Depends(_require_internal_token)],
)
def bot_restore_request(payload: BotRestoreRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    service = PaymentService(get_settings(), db)
    logger.info("bot_restore_request", extra={"email": mask_email(payload.email)})
    return service.restore_request(email=payload.email)


@router.post(
    "/api/bot/restore/confirm",
    dependencies=[Depends(_require_internal_token)],
)
def bot_restore_confirm(payload: BotRestoreConfirmRequest, db: Session = Depends(get_db)) -> dict[str, str | bool | None]:
    service = PaymentService(get_settings(), db)
    logger.info(
        "bot_restore_confirm",
        extra={"email": mask_email(payload.email), "telegram_user_id": payload.telegram_user_id},
    )
    return service.restore_confirm(email=payload.email, otp=payload.otp, telegram_user_id=payload.telegram_user_id)
