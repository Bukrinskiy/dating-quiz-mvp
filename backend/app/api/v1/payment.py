from __future__ import annotations

import time
import logging
from typing import cast

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.schemas.payment import (
    ActivateAccessRequest,
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    CustomerPortalRequest,
    MobiSlonEventRequest,
    MobiSlonEventResponse,
    RestoreConfirmRequest,
    RestoreRequest,
    SessionStatusResponse,
)
from app.core.config import get_settings
from app.core.db.session import get_db
from app.services.payment_service import PaymentService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/api/payment/checkout-session", response_model=CheckoutSessionResponse)
def create_checkout_session(payload: CheckoutSessionRequest, db: Session = Depends(get_db)) -> CheckoutSessionResponse:
    service = PaymentService(get_settings(), db)
    checkout_url, session_id, order_id = service.create_checkout_session(
        mode=payload.mode,
        plan=payload.plan,
        email=payload.email,
        clickid=payload.clickid,
        locale=payload.locale,
        telegram_chat_id=payload.telegram_chat_id,
    )
    return CheckoutSessionResponse(checkout_url=checkout_url, session_id=session_id, order_id=order_id)


@router.post("/api/stripe/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(default=None, alias="stripe-signature"),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    payload = await request.body()
    service = PaymentService(get_settings(), db)
    return service.handle_webhook(payload, stripe_signature)


@router.get("/api/payment/session-status", response_model=SessionStatusResponse)
def session_status(session_id: str = Query(min_length=1), db: Session = Depends(get_db)) -> SessionStatusResponse:
    service = PaymentService(get_settings(), db)
    payload = service.get_session_status(session_id)
    return SessionStatusResponse(
        payment_status=cast(str, payload["payment_status"]),
        fulfillment_status=cast(str, payload["fulfillment_status"]),
        access_status=cast(str, payload["access_status"]),
        activation_link=cast(str | None, payload["activation_link"]),
    )


@router.post("/api/payment/customer-portal")
def customer_portal(payload: CustomerPortalRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    service = PaymentService(get_settings(), db)
    return {"portal_url": service.create_customer_portal(payload.email)}


@router.post("/api/access/activate")
def activate_access(payload: ActivateAccessRequest, db: Session = Depends(get_db)) -> dict[str, str | bool]:
    service = PaymentService(get_settings(), db)
    return service.activate_access(activation_token=payload.activation_token, telegram_user_id=payload.telegram_user_id)


@router.post("/api/auth/restore/request")
def restore_request(payload: RestoreRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    service = PaymentService(get_settings(), db)
    return service.restore_request(email=payload.email)


@router.post("/api/auth/restore/confirm")
def restore_confirm(payload: RestoreConfirmRequest, db: Session = Depends(get_db)) -> dict[str, str | bool | None]:
    service = PaymentService(get_settings(), db)
    return service.restore_confirm(email=payload.email, otp=payload.otp, telegram_user_id=payload.telegram_user_id)


@router.post("/api/events/mobi-slon", response_model=MobiSlonEventResponse)
@router.post("/api/tracking/mobi-slon-event", response_model=MobiSlonEventResponse)
def relay_mobi_slon_event(payload: MobiSlonEventRequest, db: Session = Depends(get_db)) -> MobiSlonEventResponse:
    logger.info(
        "mobi_relay_http_in method=POST status=%s clickid=%s session_id=%s params=%d",
        payload.status,
        payload.clickid[:64],
        (payload.session_id or "")[:64],
        len(payload.tracking_params or {}),
    )
    service = PaymentService(get_settings(), db)
    forwarded = service.relay_mobi_slon_event(
        status=payload.status,
        clickid=payload.clickid,
        tracking_params=payload.tracking_params,
        session_id=payload.session_id,
        page_path=payload.page_path,
    )
    return MobiSlonEventResponse(accepted=True, forwarded=forwarded)


@router.get("/api/events/mobi-slon", response_model=MobiSlonEventResponse)
@router.get("/api/tracking/mobi-slon-event", response_model=MobiSlonEventResponse)
def relay_mobi_slon_event_fallback(
    request: Request,
    status: str = Query(min_length=1),
    clickid: str = Query(min_length=1),
    session_id: str | None = Query(default=None),
    page_path: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> MobiSlonEventResponse:
    tracking_params = {
        key: value
        for key, value in request.query_params.multi_items()
        if key not in {"status", "clickid", "session_id", "page_path"}
    }
    logger.info(
        "mobi_relay_http_in method=GET status=%s clickid=%s session_id=%s params=%d",
        status,
        clickid[:64],
        (session_id or "")[:64],
        len(tracking_params),
    )
    service = PaymentService(get_settings(), db)
    forwarded = service.relay_mobi_slon_event(
        status=status,
        clickid=clickid,
        tracking_params=tracking_params,
        session_id=session_id,
        page_path=page_path,
    )
    return MobiSlonEventResponse(accepted=True, forwarded=forwarded)


@router.get("/api/payment/redirect")
def legacy_payment_redirect() -> None:
    raise HTTPException(status_code=410, detail="Endpoint moved to POST /api/payment/checkout-session")


@router.get("/api/tracking/meta-event")
def send_meta_event(
    request: Request,
    status: str | None = Query(default=None),
    fbclid: str = Query(default=""),
    ip: str = Query(default=""),
    ua: str = Query(default=""),
) -> JSONResponse:
    if not status:
        return JSONResponse(status_code=400, content={"error": "status is required"})

    settings = get_settings()
    if not settings.meta_pixel_id or not settings.meta_access_token:
        raise HTTPException(status_code=503, detail="Meta CAPI is not configured")

    client_ip = ip or (request.client.host if request.client else "")
    client_user_agent = ua or request.headers.get("user-agent", "")
    payload = {
        "data": [
            {
                "event_name": status,
                "event_time": int(time.time()),
                "action_source": "website",
                "user_data": {
                    "fbc": fbclid,
                    "client_ip_address": client_ip,
                    "client_user_agent": client_user_agent,
                },
            }
        ]
    }
    url = f"https://graph.facebook.com/{settings.meta_graph_api_version}/{settings.meta_pixel_id}/events"

    try:
        response = httpx.post(
            url,
            params={"access_token": settings.meta_access_token},
            json=payload,
            timeout=15.0,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Meta API request failed: {exc.__class__.__name__}") from exc

    try:
        response_payload = response.json()
    except ValueError:
        response_payload = {"raw": response.text}

    return JSONResponse(status_code=response.status_code, content=response_payload)
