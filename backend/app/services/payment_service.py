from __future__ import annotations

from datetime import datetime, timedelta, timezone
import logging
import re
from typing import Any, Literal, Mapping, cast

import httpx
import stripe
from fastapi import HTTPException
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_plan_map
from app.core.mobi_slon_events import MOBI_SLON_EVENT_SET
from app.core.models.payment import AccessBinding, AccessToken, Order, PaymentEvent, RestoreOTP
from app.core.notifications import TelegramSender, build_email_sender
from app.core.security import generate_otp, hash_value, make_access_token, mask_email, parse_access_token, utcnow

logger = logging.getLogger("quiz.payments")
SAFE_CLICK_ID_RE = re.compile(r"[^a-zA-Z0-9_.-]")
SAFE_STATUS_RE = re.compile(r"^[a-z0-9_]{1,64}$")
SAFE_PARAM_KEY_RE = re.compile(r"^[a-zA-Z0-9_.-]{1,64}$")


class PaymentService:
    def __init__(self, settings: Settings, db: Session) -> None:
        self.settings = settings
        self.db = db
        self.plan_map = get_plan_map(settings)
        self.email_sender = build_email_sender(settings)
        self.telegram_sender = TelegramSender(settings)
        stripe.api_key = settings.stripe_secret_key

    @staticmethod
    def sanitize_clickid(raw_clickid: str) -> str:
        return SAFE_CLICK_ID_RE.sub("", raw_clickid)

    @staticmethod
    def normalize_locale(raw_locale: str | None) -> str:
        if not raw_locale:
            return "en"
        locale = raw_locale.strip().lower()
        if locale.startswith("ru"):
            return "ru"
        return "en"

    @staticmethod
    def normalize_postback_status(raw_status: str) -> str:
        status = raw_status.strip().lower()
        if not status or not SAFE_STATUS_RE.match(status):
            raise HTTPException(status_code=400, detail="Invalid status")
        if status not in MOBI_SLON_EVENT_SET:
            raise HTTPException(status_code=400, detail="Unknown status")
        return status

    @staticmethod
    def sanitize_tracking_params(raw_params: Mapping[str, str] | None) -> dict[str, str]:
        if not raw_params:
            return {}
        sanitized: dict[str, str] = {}
        for raw_key, raw_value in raw_params.items():
            key = str(raw_key).strip()
            if not key or not SAFE_PARAM_KEY_RE.match(key):
                continue
            if key in {"cnv_id", "payout", "cnv_status"}:
                continue
            value = str(raw_value).strip()
            if not value:
                continue
            sanitized[key] = value[:512]
        return sanitized

    @staticmethod
    def _format_amount_minor(amount_minor: int, currency: str) -> str:
        currency_upper = (currency or "").upper()
        zero_decimal_currencies = {
            "BIF",
            "CLP",
            "DJF",
            "GNF",
            "JPY",
            "KMF",
            "KRW",
            "MGA",
            "PYG",
            "RWF",
            "UGX",
            "VND",
            "VUV",
            "XAF",
            "XOF",
            "XPF",
        }
        if currency_upper in zero_decimal_currencies:
            return str(max(0, amount_minor))
        return f"{max(0, amount_minor) / 100:.2f}"

    def _subscription_payout(self) -> str:
        return self._format_amount_minor(
            self.settings.pay_sub_monthly_amount_minor,
            self.settings.pay_sub_monthly_currency,
        )

    def _build_success_url(self) -> str:
        success_url = self.settings.resolved_pay_success_url
        if "?" in success_url:
            return f"{success_url}&session_id={{CHECKOUT_SESSION_ID}}"
        return f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}"

    def create_checkout_session(
        self,
        *,
        mode: str,
        plan: str,
        email: str,
        clickid: str,
        locale: str | None,
        telegram_chat_id: str | None,
    ) -> tuple[str, str, str]:
        order_clickid = self.sanitize_clickid(clickid.strip())
        if not order_clickid:
            raise HTTPException(status_code=400, detail="Invalid clickid")

        plan_cfg = self.plan_map.get(plan)
        if plan_cfg is None:
            raise HTTPException(status_code=400, detail="Unknown plan")
        product_name = {
            "one_time_basic": self.settings.pay_one_time_basic_product_name,
            "sub_monthly": self.settings.pay_sub_monthly_product_name,
        }.get(plan, "Seranking Premium")

        if mode == "subscription" and plan_cfg.interval is None:
            raise HTTPException(status_code=400, detail="Plan does not support subscription")
        if mode == "one_time" and plan_cfg.interval is not None:
            raise HTTPException(status_code=400, detail="Plan is subscription-only")

        order = Order(
            email=email,
            clickid=order_clickid,
            telegram_chat_id=telegram_chat_id,
            mode=mode,
            plan=plan,
            locale=self.normalize_locale(locale),
            amount_minor=plan_cfg.amount_minor,
            currency=plan_cfg.currency,
            status="created",
        )
        self.db.add(order)
        self.db.flush()

        line_item: dict[str, Any] = {
            "price_data": {
                "currency": plan_cfg.currency,
                "unit_amount": plan_cfg.amount_minor,
                "product_data": {"name": product_name},
            },
            "quantity": 1,
        }
        stripe_mode: Literal["payment", "subscription"] = "payment"
        if mode == "subscription":
            stripe_mode = "subscription"
            line_item["price_data"]["recurring"] = {"interval": plan_cfg.interval}

        metadata = {"order_id": order.id, "clickid": order_clickid, "plan": plan, "mode": mode, "email": email}

        try:
            session = stripe.checkout.Session.create(
                mode=stripe_mode,
                line_items=cast(list[Any], [line_item]),
                success_url=self._build_success_url(),
                cancel_url=self.settings.resolved_pay_cancel_url,
                customer_email=email,
                metadata=metadata,
            )
        except Exception as exc:
            self.db.rollback()
            raise HTTPException(status_code=502, detail=f"Stripe error: {exc}") from exc

        checkout_url = session.url
        if checkout_url is None:
            self.db.rollback()
            raise HTTPException(status_code=502, detail="Stripe did not return checkout URL")

        order.stripe_session_id = session.id
        order.status = "session_created"
        self.db.commit()
        return checkout_url, session.id, order.id

    def get_session_status(self, session_id: str) -> dict[str, str | None]:
        order = self.db.scalar(select(Order).where(Order.stripe_session_id == session_id))
        if order is None:
            raise HTTPException(status_code=404, detail="Session not found")

        activation_link: str | None = None
        token = self.db.scalar(
            select(AccessToken)
            .where(AccessToken.order_id == order.id, AccessToken.status == "issued")
            .order_by(desc(AccessToken.issued_at))
        )
        if token is not None:
            token_value = make_access_token(token.id, self.settings.access_token_secret)
            activation_link = self.telegram_sender.build_deep_link(token_value)

        return {
            "payment_status": order.status,
            "fulfillment_status": order.fulfillment_status,
            "access_status": order.access_status,
            "activation_link": activation_link,
        }

    def create_customer_portal(self, email: str) -> str:
        order = self.db.scalar(
            select(Order)
            .where(Order.email == email, Order.stripe_customer_id.is_not(None))
            .order_by(desc(Order.updated_at))
        )
        if order is None or not order.stripe_customer_id:
            raise HTTPException(status_code=404, detail="No stripe customer found")

        try:
            session = stripe.billing_portal.Session.create(
                customer=order.stripe_customer_id,
                return_url=self.settings.resolved_pay_portal_return_url,
            )
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Stripe error: {exc}") from exc
        return session.url

    def handle_webhook(self, payload: bytes, signature: str | None) -> dict[str, bool]:
        if not signature:
            raise HTTPException(status_code=400, detail="Missing stripe-signature")

        try:
            event = stripe.Webhook.construct_event(payload, signature, self.settings.stripe_webhook_secret)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Invalid webhook: {exc}") from exc

        event_id = event["id"]
        event_type = event["type"]
        logger.info("stripe_webhook_received event_id=%s event_type=%s", event_id, event_type)
        existing = self.db.scalar(select(PaymentEvent).where(PaymentEvent.stripe_event_id == event_id))
        if existing is not None:
            logger.info("stripe_webhook_duplicate event_id=%s event_type=%s", event_id, event_type)
            return {"ok": True, "duplicate": True}

        payment_event = PaymentEvent(
            stripe_event_id=event_id,
            event_type=event_type,
            payload_json=event,
            process_result="processed",
        )
        self.db.add(payment_event)

        obj = event["data"]["object"]
        postback_clickid: str | None = None

        if event_type == "checkout.session.completed":
            postback_clickid = self._on_checkout_session_completed(obj)
        elif event_type == "checkout.session.expired":
            self._update_order_status_by_session(obj.get("id"), status="expired")
        elif event_type == "payment_intent.payment_failed":
            self._update_order_status_by_payment_intent(obj.get("id"), status="failed")
        elif event_type == "invoice.paid":
            period_end_ts = (((obj.get("lines") or {}).get("data") or [{}])[0].get("period") or {}).get("end")
            order = self._find_order_by_subscription(obj.get("subscription"), obj.get("customer"))
            self._apply_subscription_access_update(
                order=order,
                payment_status="paid",
                access_status="active",
                binding_status="active",
                current_period_end_ts=period_end_ts,
            )
        elif event_type == "invoice.payment_failed":
            period_end_ts = (((obj.get("lines") or {}).get("data") or [{}])[0].get("period") or {}).get("end")
            order = self._find_order_by_subscription(obj.get("subscription"), obj.get("customer"))
            period_end = self._as_utc_datetime(period_end_ts)
            if period_end is None and order is not None:
                period_end = order.stripe_current_period_end
            in_grace = self._grace_window_open(period_end)
            self._apply_subscription_access_update(
                order=order,
                payment_status="past_due",
                access_status="grace_period" if in_grace else "expired",
                binding_status="active" if in_grace else "inactive",
                current_period_end_ts=period_end_ts,
            )
        elif event_type == "customer.subscription.updated":
            self._update_order_status_by_subscription(
                obj.get("id"),
                cast(str, obj.get("status") or "active"),
                obj.get("current_period_end"),
            )
        elif event_type == "customer.subscription.deleted":
            order = self._find_order_by_subscription(obj.get("id"), obj.get("customer"))
            self._apply_subscription_access_update(
                order=order,
                payment_status="canceled",
                access_status="revoked",
                binding_status="inactive",
                current_period_end_ts=obj.get("current_period_end"),
            )
        else:
            logger.info("stripe_event_ignored event_type=%s", event_type)

        self.db.commit()
        logger.info("stripe_webhook_processed event_id=%s event_type=%s", event_id, event_type)
        if event_type == "checkout.session.completed" and postback_clickid:
            self._send_mobi_slon_postback(
                status="pay_success",
                clickid=postback_clickid,
                extra_params={"payout": self._subscription_payout()},
                source="stripe_webhook",
            )
        return {"ok": True, "duplicate": False}

    def relay_mobi_slon_event(
        self,
        *,
        status: str,
        clickid: str,
        tracking_params: Mapping[str, str] | None,
        session_id: str | None,
        page_path: str | None,
    ) -> bool:
        normalized_status = self.normalize_postback_status(status)
        sanitized_clickid = self.sanitize_clickid(clickid.strip())
        if not sanitized_clickid:
            raise HTTPException(status_code=400, detail="Invalid clickid")

        if normalized_status == "pay_success":
            logger.warning("mobi_slon_relay_skipped status=%s source=frontend_relay reason=reserved_server_side", normalized_status)
            return False

        safe_params = self.sanitize_tracking_params(tracking_params)
        logger.info(
            "mobi_slon_relay_request status=%s clickid=%s session_id=%s page_path=%s params=%d",
            normalized_status,
            sanitized_clickid,
            (session_id or "").strip()[:128],
            (page_path or "").strip()[:180],
            len(safe_params),
        )
        return self._send_mobi_slon_postback(
            status=normalized_status,
            clickid=sanitized_clickid,
            extra_params=safe_params,
            source="frontend_relay",
        )

    def activate_access(self, *, activation_token: str, telegram_user_id: str) -> dict[str, str | bool]:
        token_id = parse_access_token(activation_token, self.settings.access_token_secret)
        if token_id is None:
            logger.warning(
                "activate_access_invalid_token user=%s token_len=%d token_preview=%s",
                telegram_user_id,
                len(activation_token),
                f"{activation_token[:8]}...{activation_token[-6:]}" if len(activation_token) > 16 else activation_token,
            )
            raise HTTPException(status_code=400, detail="Invalid activation token")

        token = self.db.scalar(select(AccessToken).where(AccessToken.id == token_id))
        if token is None or token.status != "issued":
            logger.warning(
                "activate_access_token_not_issued user=%s token_id=%s token_exists=%s token_status=%s",
                telegram_user_id,
                token_id,
                token is not None,
                token.status if token is not None else None,
            )
            raise HTTPException(status_code=400, detail="Activation token is not active")

        order = self.db.scalar(select(Order).where(Order.id == token.order_id))
        if order is None:
            logger.warning("activate_access_order_not_found user=%s token_id=%s order_id=%s", telegram_user_id, token_id, token.order_id)
            raise HTTPException(status_code=404, detail="Order not found")

        token.status = "activated"
        token.activated_at = utcnow()
        order.access_status = "active"

        binding = self.db.scalar(
            select(AccessBinding).where(AccessBinding.order_id == order.id, AccessBinding.telegram_user_id == telegram_user_id)
        )
        if binding is None:
            self.db.add(AccessBinding(order_id=order.id, telegram_user_id=telegram_user_id, status="active"))
            logger.info("activate_access_binding_created user=%s order_id=%s", telegram_user_id, order.id)
        else:
            binding.status = "active"
            logger.info("activate_access_binding_reactivated user=%s order_id=%s", telegram_user_id, order.id)

        self.db.commit()
        logger.info("activate_access_success user=%s order_id=%s plan=%s", telegram_user_id, order.id, order.plan)
        return {"access_granted": True, "order_id": order.id, "plan": order.plan, "status": order.status}

    def restore_request(self, *, email: str) -> dict[str, str]:
        one_hour_ago = utcnow() - timedelta(hours=1)
        recent_count = self.db.query(RestoreOTP).filter(RestoreOTP.email == email, RestoreOTP.created_at >= one_hour_ago).count()
        if recent_count >= self.settings.restore_rate_limit_per_hour:
            raise HTTPException(status_code=429, detail="Too many restore requests")

        otp = generate_otp()
        record = RestoreOTP(
            email=email,
            otp_hash=hash_value(otp),
            attempts=0,
            max_attempts=5,
            expires_at=utcnow() + timedelta(seconds=self.settings.otp_ttl_seconds),
        )
        self.db.add(record)
        self.db.commit()

        latest_order = self.db.scalar(
            select(Order)
            .where(Order.email == email)
            .order_by(desc(Order.updated_at))
        )
        locale = latest_order.locale if latest_order is not None else "en"

        try:
            self.email_sender.send_otp(
                email=email,
                otp=otp,
                allow_plain_otp=self.settings.log_otp_in_nonprod,
                locale=locale,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("otp_delivery_failed", extra={"email": mask_email(email), "error": str(exc)})
            raise HTTPException(status_code=502, detail="Failed to send OTP email") from exc
        return {"status": "otp_logged"}

    def restore_confirm(self, *, email: str, otp: str, telegram_user_id: str | None) -> dict[str, str | bool | None]:
        record = self.db.scalar(
            select(RestoreOTP)
            .where(RestoreOTP.email == email, RestoreOTP.used_at.is_(None))
            .order_by(desc(RestoreOTP.created_at))
        )
        if record is None:
            raise HTTPException(status_code=400, detail="No restore request found")

        record_expires_at = record.expires_at
        if record_expires_at.tzinfo is None:
            record_expires_at = record_expires_at.replace(tzinfo=timezone.utc)

        if record_expires_at < utcnow():
            raise HTTPException(status_code=400, detail="OTP expired")

        if record.attempts >= record.max_attempts:
            raise HTTPException(status_code=400, detail="OTP attempts exceeded")

        if record.otp_hash != hash_value(otp):
            record.attempts += 1
            self.db.commit()
            raise HTTPException(status_code=400, detail="Invalid OTP")

        record.used_at = utcnow()

        order = self.db.scalar(select(Order).where(Order.email == email).order_by(desc(Order.updated_at)))
        if order is None or order.status not in {"paid", "active"}:
            raise HTTPException(status_code=404, detail="No paid order found")

        issued_tokens = self.db.scalars(
            select(AccessToken).where(AccessToken.order_id == order.id, AccessToken.status == "issued")
        ).all()
        for tkn in issued_tokens:
            tkn.status = "revoked"
            tkn.revoked_reason = "restore_rotation"
            tkn.revoked_at = utcnow()

        new_token = AccessToken(order_id=order.id, status="issued")
        self.db.add(new_token)
        self.db.flush()

        token_value = make_access_token(new_token.id, self.settings.access_token_secret)
        activation_link = self.telegram_sender.build_deep_link(token_value)
        if telegram_user_id:
            self.activate_access(activation_token=token_value, telegram_user_id=telegram_user_id)

        self.db.commit()
        return {
            "status": "restored",
            "activation_link": activation_link,
            "access_granted": bool(telegram_user_id),
        }

    def get_access_status_by_telegram_user(self, telegram_user_id: str) -> dict[str, str | bool | None]:
        active_binding = self.db.scalar(
            select(AccessBinding)
            .where(AccessBinding.telegram_user_id == telegram_user_id, AccessBinding.status == "active")
            .order_by(desc(AccessBinding.bound_at))
        )
        if active_binding is not None:
            order = self.db.scalar(select(Order).where(Order.id == active_binding.order_id))
            if order is not None:
                return {
                    "is_paid": order.access_status == "active" or order.status in {"paid", "active"},
                    "order_id": order.id,
                    "plan": order.plan,
                    "access_status": order.access_status,
                }

        latest_binding = self.db.scalar(
            select(AccessBinding).where(AccessBinding.telegram_user_id == telegram_user_id).order_by(desc(AccessBinding.bound_at))
        )
        if latest_binding is not None:
            order = self.db.scalar(select(Order).where(Order.id == latest_binding.order_id))
            if order is not None:
                return {
                    "is_paid": False,
                    "order_id": order.id,
                    "plan": order.plan,
                    "access_status": order.access_status,
                }

        fallback_order = self.db.scalar(
            select(Order)
            .where(Order.telegram_chat_id == telegram_user_id)
            .order_by(desc(Order.updated_at))
        )
        if fallback_order is None:
            return {"is_paid": False, "order_id": None, "plan": None, "access_status": None}

        return {
            "is_paid": fallback_order.access_status == "active" or fallback_order.status in {"paid", "active"},
            "order_id": fallback_order.id,
            "plan": fallback_order.plan,
            "access_status": fallback_order.access_status,
        }

    def _update_order_status_by_session(self, session_id: str | None, *, status: str) -> None:
        if not session_id:
            return
        order = self.db.scalar(select(Order).where(Order.stripe_session_id == session_id))
        if order is None:
            return
        order.status = status

    def _update_order_status_by_payment_intent(self, payment_intent_id: str | None, *, status: str) -> None:
        if not payment_intent_id:
            return
        order = self.db.scalar(select(Order).where(Order.stripe_payment_intent_id == payment_intent_id))
        if order is None:
            return
        order.status = status

    @staticmethod
    def _as_utc_datetime(unix_ts: int | float | None) -> datetime | None:
        if unix_ts is None:
            return None
        return datetime.fromtimestamp(unix_ts, tz=timezone.utc)

    def _find_order_by_subscription(self, subscription_id: str | None, customer_id: str | None = None) -> Order | None:
        if subscription_id:
            by_subscription = self.db.scalar(select(Order).where(Order.stripe_subscription_id == subscription_id))
            if by_subscription is not None:
                return by_subscription
        if customer_id:
            return self.db.scalar(
                select(Order)
                .where(Order.stripe_customer_id == customer_id)
                .order_by(desc(Order.updated_at))
            )
        return None

    def _set_bindings_status(self, order_id: str, *, status: str) -> None:
        bindings = self.db.scalars(select(AccessBinding).where(AccessBinding.order_id == order_id)).all()
        for binding in bindings:
            binding.status = status

    def _grace_window_open(self, period_end: datetime | None) -> bool:
        if period_end is None:
            return False
        if period_end.tzinfo is None:
            period_end = period_end.replace(tzinfo=timezone.utc)
        grace_deadline = period_end + timedelta(seconds=self.settings.subscription_grace_period_seconds)
        return utcnow() <= grace_deadline

    def _apply_subscription_access_update(
        self,
        *,
        order: Order | None,
        payment_status: str,
        access_status: str,
        binding_status: str | None,
        current_period_end_ts: int | float | None,
    ) -> None:
        if order is None:
            return
        order.status = payment_status
        period_end = self._as_utc_datetime(current_period_end_ts)
        if period_end is not None:
            order.stripe_current_period_end = period_end
        order.access_status = access_status
        if binding_status is not None:
            self._set_bindings_status(order.id, status=binding_status)

    def _update_order_status_by_subscription(
        self,
        subscription_id: str | None,
        status: str,
        current_period_end_ts: int | float | None,
    ) -> None:
        if not subscription_id:
            return
        order = self.db.scalar(select(Order).where(Order.stripe_subscription_id == subscription_id))
        if order is None:
            return
        order.status = status
        period_end = self._as_utc_datetime(current_period_end_ts)
        if period_end is not None:
            order.stripe_current_period_end = period_end

    def _on_checkout_session_completed(self, session_obj: dict) -> str | None:
        order_id = (session_obj.get("metadata") or {}).get("order_id")
        order: Order | None = None
        if order_id:
            order = self.db.scalar(select(Order).where(Order.id == order_id))
        if order is None:
            session_id = session_obj.get("id")
            if session_id:
                order = self.db.scalar(select(Order).where(Order.stripe_session_id == session_id))
        if order is None:
            return None

        order.status = "paid"
        order.stripe_session_id = session_obj.get("id") or order.stripe_session_id
        order.stripe_payment_intent_id = session_obj.get("payment_intent") or order.stripe_payment_intent_id
        order.stripe_customer_id = session_obj.get("customer") or order.stripe_customer_id
        order.stripe_subscription_id = session_obj.get("subscription") or order.stripe_subscription_id
        period_end = self._as_utc_datetime(session_obj.get("current_period_end"))
        if period_end is not None:
            order.stripe_current_period_end = period_end

        token = self.db.scalar(
            select(AccessToken)
            .where(AccessToken.order_id == order.id, AccessToken.status == "issued")
            .order_by(desc(AccessToken.issued_at))
        )
        if token is None:
            token = AccessToken(order_id=order.id, status="issued")
            self.db.add(token)
            self.db.flush()

        token_value = make_access_token(token.id, self.settings.access_token_secret)
        activation_link = self.telegram_sender.build_deep_link(token_value)

        email_ok = True
        try:
            self.email_sender.send_access_email(
                email=order.email,
                order_id=order.id,
                activation_link=activation_link,
                locale=order.locale,
            )
        except Exception as exc:  # noqa: BLE001
            email_ok = False
            logger.warning("email_delivery_failed order_id=%s email=%s error=%s", order.id, mask_email(order.email), str(exc))

        telegram_ok = True
        if order.telegram_chat_id:
            telegram_ok = self.telegram_sender.send_activation_message(chat_id=order.telegram_chat_id, token=token_value)

        order.fulfillment_status = "done" if telegram_ok and email_ok else "partial"
        order.access_status = "token_issued"
        logger.info(
            "checkout_session_completed order_id=%s session_id=%s clickid=%s fulfillment_status=%s access_status=%s",
            order.id,
            order.stripe_session_id,
            order.clickid,
            order.fulfillment_status,
            order.access_status,
        )
        return order.clickid

    def _send_mobi_slon_postback(
        self,
        *,
        status: str,
        clickid: str,
        extra_params: Mapping[str, str] | None = None,
        source: str = "unknown",
    ) -> bool:
        postback_base_url = self.settings.mobi_slon_postback_url.strip()
        if not postback_base_url:
            logger.warning("mobi_slon_postback_skipped_missing_url status=%s source=%s", status, source)
            return False

        request_params: dict[str, str] = {"cnv_id": clickid, "payout": "0", "cnv_status": status}
        if extra_params:
            request_params.update(extra_params)

        last_error: Exception | None = None
        for attempt in range(1, 4):
            try:
                logger.info(
                    "mobi_slon_postback_attempt status=%s clickid=%s attempt=%d source=%s params=%d",
                    status,
                    clickid,
                    attempt,
                    source,
                    len(request_params),
                )
                response = httpx.post(
                    postback_base_url,
                    params=request_params,
                    timeout=10.0,
                )
                if response.status_code < 400:
                    logger.info(
                        "mobi_slon_postback_sent status=%s clickid=%s attempt=%d source=%s code=%d body=%s",
                        status,
                        clickid,
                        attempt,
                        source,
                        response.status_code,
                        response.text[:180].replace("\n", " "),
                    )
                    return True
                last_error = RuntimeError(f"HTTP {response.status_code}")
                logger.warning(
                    "mobi_slon_postback_bad_response status=%s clickid=%s attempt=%d source=%s code=%d body=%s",
                    status,
                    clickid,
                    attempt,
                    source,
                    response.status_code,
                    response.text[:180].replace("\n", " "),
                )
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                logger.warning(
                    "mobi_slon_postback_exception status=%s clickid=%s attempt=%d source=%s error=%s",
                    status,
                    clickid,
                    attempt,
                    source,
                    str(exc),
                )

        logger.error(
            "mobi_slon_postback_failed status=%s clickid=%s source=%s error=%s",
            status,
            clickid,
            source,
            str(last_error) if last_error else "unknown",
        )
        return False
