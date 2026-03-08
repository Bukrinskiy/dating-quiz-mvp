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
    BotMediaTranscribeRequest,
    BotMediaTranscribeResponse,
    BotRestoreConfirmRequest,
    BotRestoreRequest,
    BotSessionAssetRequest,
    BotSessionAssetResponse,
    BotSessionBatchCloseRequest,
    BotSessionBatchCloseResponse,
    BotSessionConfirmContextRequest,
    BotSessionConfirmContextResponse,
    BotSessionGenerateRequest,
    BotSessionGenerateResponse,
    BotSessionRefineRequest,
    BotSessionRefineResponse,
    BotSessionResetActiveRequest,
    BotSessionResetActiveResponse,
    BotSessionResetRequest,
    BotSessionResetResponse,
    BotSessionStartRequest,
    BotSessionStartResponse,
)
from app.services.bot_session_service import BotSessionService
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


@router.post(
    "/api/bot/session/start",
    response_model=BotSessionStartResponse,
    dependencies=[Depends(_require_internal_token)],
)
def bot_session_start(payload: BotSessionStartRequest, db: Session = Depends(get_db)) -> BotSessionStartResponse:
    session = BotSessionService(get_settings(), db).start_session(telegram_user_id=payload.telegram_user_id, mode=payload.mode)
    return BotSessionStartResponse(session_id=session.id, mode=payload.mode, state=session.state, next_step="collect_context")


@router.post(
    "/api/bot/session/{session_id}/asset",
    response_model=BotSessionAssetResponse,
    dependencies=[Depends(_require_internal_token)],
)
def bot_session_asset(session_id: str, payload: BotSessionAssetRequest, db: Session = Depends(get_db)) -> BotSessionAssetResponse:
    asset = BotSessionService(get_settings(), db).append_asset(session_id=session_id, payload=payload)
    return BotSessionAssetResponse(
        session_id=asset.session_id,
        asset_id=asset.id,
        state="collecting_context",
        needs_confirmation=asset.needs_confirmation,
        summary_for_user=asset.summary_for_user,
    )


@router.post(
    "/api/bot/session/{session_id}/batch/close",
    response_model=BotSessionBatchCloseResponse,
    dependencies=[Depends(_require_internal_token)],
)
def bot_session_batch_close(
    session_id: str,
    payload: BotSessionBatchCloseRequest,
    db: Session = Depends(get_db),
) -> BotSessionBatchCloseResponse:
    return BotSessionService(get_settings(), db).close_batch(session_id=session_id, telegram_user_id=payload.telegram_user_id)


@router.post(
    "/api/bot/session/{session_id}/confirm-context",
    response_model=BotSessionConfirmContextResponse,
    dependencies=[Depends(_require_internal_token)],
)
def bot_confirm_context(
    session_id: str,
    payload: BotSessionConfirmContextRequest,
    db: Session = Depends(get_db),
) -> BotSessionConfirmContextResponse:
    state, confirmed = BotSessionService(get_settings(), db).confirm_context(session_id=session_id, payload=payload)
    return BotSessionConfirmContextResponse(session_id=session_id, state=state, confirmed=confirmed)


@router.post(
    "/api/bot/session/{session_id}/generate",
    response_model=BotSessionGenerateResponse,
    dependencies=[Depends(_require_internal_token)],
)
def bot_generate(session_id: str, payload: BotSessionGenerateRequest, db: Session = Depends(get_db)) -> BotSessionGenerateResponse:
    result = BotSessionService(get_settings(), db).generate(session_id=session_id, payload=payload)
    return BotSessionGenerateResponse(**result)


@router.post(
    "/api/bot/session/{session_id}/refine",
    response_model=BotSessionRefineResponse,
    dependencies=[Depends(_require_internal_token)],
)
def bot_refine(session_id: str, payload: BotSessionRefineRequest, db: Session = Depends(get_db)) -> BotSessionRefineResponse:
    result = BotSessionService(get_settings(), db).refine(session_id=session_id, payload=payload)
    return BotSessionRefineResponse(**result)


@router.post(
    "/api/bot/session/{session_id}/reset",
    response_model=BotSessionResetResponse,
    dependencies=[Depends(_require_internal_token)],
)
def bot_reset(session_id: str, payload: BotSessionResetRequest, db: Session = Depends(get_db)) -> BotSessionResetResponse:
    session = BotSessionService(get_settings(), db).reset(session_id=session_id, telegram_user_id=payload.telegram_user_id)
    return BotSessionResetResponse(session_id=session.id, status=session.status)


@router.post(
    "/api/bot/session/reset-active",
    response_model=BotSessionResetActiveResponse,
    dependencies=[Depends(_require_internal_token)],
)
def bot_reset_active(payload: BotSessionResetActiveRequest, db: Session = Depends(get_db)) -> BotSessionResetActiveResponse:
    closed_sessions = BotSessionService(get_settings(), db).reset_active(telegram_user_id=payload.telegram_user_id)
    return BotSessionResetActiveResponse(status="closed", closed_sessions=closed_sessions)


@router.post(
    "/api/bot/media/transcribe",
    response_model=BotMediaTranscribeResponse,
    dependencies=[Depends(_require_internal_token)],
)
def bot_media_transcribe(payload: BotMediaTranscribeRequest, db: Session = Depends(get_db)) -> BotMediaTranscribeResponse:
    text = BotSessionService(get_settings(), db).transcribe_media(asset_type=payload.asset_type, payload=payload.payload.model_dump())
    return BotMediaTranscribeResponse(text=text)
