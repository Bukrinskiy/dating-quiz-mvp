from __future__ import annotations

import base64

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Request, Response, UploadFile
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.db.session import get_db
from app.core.notifications import TelegramSender
from app.schemas.app import (
    AppAccessCodeRedeemRequest,
    AppAccessStatusResponse,
    AppAuthResponse,
    AppEmailCodeConfirmRequest,
    AppEmailCodeRequest,
    AppEmailCodeResponse,
    AppLocaleUpdateRequest,
    AppSessionDeleteAssetResponse,
    AppSessionDetailResponse,
    AppSessionListItemResponse,
    AppSupportRequest,
    AppSessionBatchCloseResponse,
    AppSessionConfirmContextRequest,
    AppSessionGenerateRequest,
    AppSessionGenerateResponse,
    AppSessionRefineRequest,
    AppSessionRefineResponse,
    AppSessionResetActiveResponse,
    AppSessionResetResponse,
    AppSessionStartRequest,
    AppSessionStartResponse,
    AppTextAssetRequest,
)
from app.services.access_code_service import AccessCodeService
from app.services.app_auth_service import AppAuthService
from app.services.bot_session_service import BotSessionService

router = APIRouter()


def _set_refresh_cookie(response: Response, refresh_token: str, settings: Settings) -> None:
    response.set_cookie(
        key=settings.app_auth_refresh_cookie_name,
        value=refresh_token,
        httponly=True,
        secure=settings.app_auth_refresh_cookie_secure,
        samesite=settings.app_auth_refresh_cookie_samesite,
        max_age=settings.app_auth_refresh_ttl_seconds,
        path=settings.app_auth_refresh_cookie_path,
        domain=settings.app_auth_refresh_cookie_domain,
    )


def _clear_refresh_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        key=settings.app_auth_refresh_cookie_name,
        path=settings.app_auth_refresh_cookie_path,
        domain=settings.app_auth_refresh_cookie_domain,
    )


def _require_app_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    access_token = authorization.split(" ", 1)[1].strip()
    return AppAuthService(settings, db).get_current_user(access_token)


def _require_paid_app_user(
    user=Depends(_require_app_user),
    db: Session = Depends(get_db),
):
    access = AppAuthService(get_settings(), db).entitlements.resolve_by_email(user.email)
    if not bool(access["has_access"]):
        raise HTTPException(status_code=403, detail="Active access required")
    return user


@router.post("/api/app/auth/email-code/request", response_model=AppEmailCodeResponse)
def app_request_email_code(payload: AppEmailCodeRequest, db: Session = Depends(get_db)) -> AppEmailCodeResponse:
    service = AppAuthService(get_settings(), db)
    return AppEmailCodeResponse(**service.request_email_code(email=str(payload.email)))


@router.post("/api/app/auth/email-code/confirm", response_model=AppAuthResponse)
def app_confirm_email_code(
    payload: AppEmailCodeConfirmRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> AppAuthResponse:
    service = AppAuthService(get_settings(), db)
    auth_payload, refresh_token = service.confirm_email_code(email=str(payload.email), code=payload.code, request=request)
    _set_refresh_cookie(response, refresh_token, get_settings())
    return AppAuthResponse.model_validate(auth_payload)


@router.post("/api/app/auth/refresh", response_model=AppAuthResponse)
def app_refresh(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> AppAuthResponse:
    settings = get_settings()
    cookie_value = request.cookies.get(settings.app_auth_refresh_cookie_name)
    if not cookie_value:
        raise HTTPException(status_code=401, detail="Missing refresh token")
    auth_payload, next_refresh_token = AppAuthService(settings, db).refresh(refresh_token=cookie_value, request=request)
    _set_refresh_cookie(response, next_refresh_token, settings)
    return AppAuthResponse.model_validate(auth_payload)


@router.post("/api/app/auth/logout")
def app_logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    settings = get_settings()
    cookie_value = request.cookies.get(settings.app_auth_refresh_cookie_name)
    AppAuthService(settings, db).logout(refresh_token=cookie_value)
    _clear_refresh_cookie(response, settings)
    return {"ok": True}


@router.get("/api/app/auth/me", response_model=AppAuthResponse)
def app_me(user=Depends(_require_app_user), db: Session = Depends(get_db)) -> AppAuthResponse:
    return AppAuthResponse.model_validate(AppAuthService(get_settings(), db)._auth_response(user))


@router.post("/api/app/auth/locale", response_model=AppAuthResponse)
def app_update_locale(
    payload: AppLocaleUpdateRequest,
    user=Depends(_require_app_user),
    db: Session = Depends(get_db),
) -> AppAuthResponse:
    auth_payload = AppAuthService(get_settings(), db).update_locale(user=user, locale=payload.locale)
    return AppAuthResponse.model_validate(auth_payload)


@router.get("/api/app/access-status", response_model=AppAccessStatusResponse)
def app_access_status(user=Depends(_require_app_user), db: Session = Depends(get_db)) -> AppAccessStatusResponse:
    payload = AppAuthService(get_settings(), db).entitlements.resolve_by_email(user.email)
    return AppAccessStatusResponse.model_validate(payload)


@router.post("/api/app/access-code/redeem", response_model=AppAuthResponse)
def app_redeem_access_code(
    payload: AppAccessCodeRedeemRequest,
    user=Depends(_require_app_user),
    db: Session = Depends(get_db),
) -> AppAuthResponse:
    AccessCodeService(db).redeem_code(email=user.email, code=payload.code)
    auth_payload = AppAuthService(get_settings(), db)._auth_response(user)
    return AppAuthResponse.model_validate(auth_payload)


@router.post("/api/app/support")
def app_support_submit(
    payload: AppSupportRequest,
    user=Depends(_require_app_user),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="empty")

    header = (
        "Новое сообщение /support (web)\n"
        f"app_user_id: {user.id}\n"
        f"email: {user.email}\n"
        f"preview: {text[:240]}"
    )
    settings = get_settings()
    delivered = TelegramSender(settings).send_admin_alert(text=header + "\n\n" + text[:3500])
    if not delivered:
        raise HTTPException(status_code=503, detail="support_unavailable")
    return {"ok": True}


@router.post("/api/app/session/start", response_model=AppSessionStartResponse)
def app_session_start(payload: AppSessionStartRequest, user=Depends(_require_paid_app_user), db: Session = Depends(get_db)) -> AppSessionStartResponse:
    session = BotSessionService(get_settings(), db).start_app_session(app_user_id=user.id, mode=payload.mode)
    return AppSessionStartResponse(
        session_id=session.id,
        mode=session.mode,
        state=session.state,
        next_step="collect_context",
    )


@router.get("/api/app/sessions", response_model=list[AppSessionListItemResponse])
def app_session_list(user=Depends(_require_paid_app_user), db: Session = Depends(get_db)) -> list[AppSessionListItemResponse]:
    items = BotSessionService(get_settings(), db).list_app_sessions(app_user_id=user.id)
    return [AppSessionListItemResponse.model_validate(item) for item in items]


@router.get("/api/app/session/{session_id}", response_model=AppSessionDetailResponse)
def app_session_detail(session_id: str, user=Depends(_require_paid_app_user), db: Session = Depends(get_db)) -> AppSessionDetailResponse:
    payload = BotSessionService(get_settings(), db).get_app_session_detail(session_id=session_id, app_user_id=user.id)
    return AppSessionDetailResponse.model_validate(payload)


@router.post("/api/app/session/{session_id}/asset-text")
def app_session_asset_text(
    session_id: str,
    payload: AppTextAssetRequest,
    user=Depends(_require_paid_app_user),
    db: Session = Depends(get_db),
) -> dict[str, str | bool]:
    asset = BotSessionService(get_settings(), db).append_app_text_asset(
        session_id=session_id,
        app_user_id=user.id,
        text=payload.text,
        role=payload.role,
        display_name=payload.display_name,
        sent_at=payload.sent_at,
    )
    return {
        "session_id": asset.session_id,
        "asset_id": asset.id,
        "state": "collecting_context",
        "needs_confirmation": asset.needs_confirmation,
        "summary_for_user": asset.summary_for_user,
    }


@router.delete("/api/app/session/{session_id}/asset/{asset_id}", response_model=AppSessionDeleteAssetResponse)
def app_session_delete_asset(
    session_id: str,
    asset_id: str,
    user=Depends(_require_paid_app_user),
    db: Session = Depends(get_db),
) -> AppSessionDeleteAssetResponse:
    payload = BotSessionService(get_settings(), db).delete_app_asset(
        session_id=session_id,
        asset_id=asset_id,
        app_user_id=user.id,
    )
    return AppSessionDeleteAssetResponse.model_validate(payload)


@router.delete("/api/app/session/{session_id}/message/{message_id}", response_model=AppSessionDeleteAssetResponse)
def app_session_delete_message(
    session_id: str,
    message_id: str,
    user=Depends(_require_paid_app_user),
    db: Session = Depends(get_db),
) -> AppSessionDeleteAssetResponse:
    payload = BotSessionService(get_settings(), db).delete_app_message(
        session_id=session_id,
        message_id=message_id,
        app_user_id=user.id,
    )
    return AppSessionDeleteAssetResponse.model_validate(payload)


async def _read_upload_as_base64(file: UploadFile) -> str:
    payload = await file.read()
    return base64.b64encode(payload).decode("ascii")


@router.post("/api/app/session/{session_id}/asset-image")
async def app_session_asset_image(
    session_id: str,
    file: UploadFile = File(...),
    role: str | None = Form(default=None),
    display_name: str | None = Form(default=None),
    sent_at: str | None = Form(default=None),
    user=Depends(_require_paid_app_user),
    db: Session = Depends(get_db),
) -> dict[str, str | bool]:
    asset = await BotSessionService(get_settings(), db).append_app_media_asset(
        session_id=session_id,
        app_user_id=user.id,
        asset_type="image",
        mime_type=file.content_type or "image/jpeg",
        content_base64=await _read_upload_as_base64(file),
        file_name=file.filename,
        role=role,
        display_name=display_name,
        sent_at=sent_at,
    )
    return {
        "session_id": asset.session_id,
        "asset_id": asset.id,
        "state": "collecting_context",
        "needs_confirmation": asset.needs_confirmation,
        "summary_for_user": asset.summary_for_user,
    }


@router.post("/api/app/session/{session_id}/asset-audio")
async def app_session_asset_audio(
    session_id: str,
    file: UploadFile = File(...),
    role: str | None = Form(default=None),
    display_name: str | None = Form(default=None),
    sent_at: str | None = Form(default=None),
    user=Depends(_require_paid_app_user),
    db: Session = Depends(get_db),
) -> dict[str, str | bool]:
    asset = await BotSessionService(get_settings(), db).append_app_media_asset(
        session_id=session_id,
        app_user_id=user.id,
        asset_type="audio",
        mime_type=file.content_type or "audio/ogg",
        content_base64=await _read_upload_as_base64(file),
        file_name=file.filename,
        role=role,
        display_name=display_name,
        sent_at=sent_at,
    )
    return {
        "session_id": asset.session_id,
        "asset_id": asset.id,
        "state": "collecting_context",
        "needs_confirmation": asset.needs_confirmation,
        "summary_for_user": asset.summary_for_user,
    }


@router.post("/api/app/session/{session_id}/batch/close", response_model=AppSessionBatchCloseResponse)
def app_session_batch_close(session_id: str, user=Depends(_require_paid_app_user), db: Session = Depends(get_db)) -> AppSessionBatchCloseResponse:
    payload = BotSessionService(get_settings(), db).close_app_batch(session_id=session_id, app_user_id=user.id)
    return AppSessionBatchCloseResponse.model_validate(payload.model_dump())


@router.post("/api/app/session/{session_id}/confirm-context", response_model=AppSessionBatchCloseResponse)
def app_session_confirm_context(
    session_id: str,
    payload: AppSessionConfirmContextRequest,
    user=Depends(_require_paid_app_user),
    db: Session = Depends(get_db),
) -> AppSessionBatchCloseResponse:
    state, confirmed = BotSessionService(get_settings(), db).confirm_app_context(
        session_id=session_id,
        app_user_id=user.id,
        action=payload.action,
        edit_text=payload.edit_text,
    )
    return AppSessionBatchCloseResponse(session_id=session_id, state=state, needs_confirmation=not confirmed, context_preview="")


@router.post("/api/app/session/{session_id}/generate", response_model=AppSessionGenerateResponse)
def app_session_generate(
    session_id: str,
    payload: AppSessionGenerateRequest,
    user=Depends(_require_paid_app_user),
    db: Session = Depends(get_db),
) -> AppSessionGenerateResponse:
    result = BotSessionService(get_settings(), db).generate_app(
        session_id=session_id,
        app_user_id=user.id,
        scenario=payload.scenario,
        tone=payload.tone,
        constraints=payload.constraints,
        tried_actions=payload.tried_actions,
        target_outcome=payload.target_outcome,
        locale=user.locale,
    )
    return AppSessionGenerateResponse.model_validate(result)


@router.post("/api/app/session/{session_id}/refine", response_model=AppSessionRefineResponse)
def app_session_refine(
    session_id: str,
    payload: AppSessionRefineRequest,
    user=Depends(_require_paid_app_user),
    db: Session = Depends(get_db),
) -> AppSessionRefineResponse:
    result = BotSessionService(get_settings(), db).refine_app(session_id=session_id, app_user_id=user.id, command=payload.command, locale=user.locale)
    return AppSessionRefineResponse.model_validate(result)


@router.post("/api/app/session/{session_id}/reset", response_model=AppSessionResetResponse)
def app_session_reset(session_id: str, user=Depends(_require_paid_app_user), db: Session = Depends(get_db)) -> AppSessionResetResponse:
    session = BotSessionService(get_settings(), db).reset_app(session_id=session_id, app_user_id=user.id)
    return AppSessionResetResponse(session_id=session.id, status=session.status)


@router.post("/api/app/session/reset-active", response_model=AppSessionResetActiveResponse)
def app_session_reset_active(user=Depends(_require_paid_app_user), db: Session = Depends(get_db)) -> AppSessionResetActiveResponse:
    closed_sessions = BotSessionService(get_settings(), db).reset_active_app(app_user_id=user.id)
    return AppSessionResetActiveResponse(status="closed", closed_sessions=closed_sessions)
