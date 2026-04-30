from __future__ import annotations

from datetime import datetime, timedelta, timezone
import logging
import re
from typing import Any, Literal, Mapping, TypedDict, cast

import httpx
import stripe
from fastapi import HTTPException
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.config import Settings, get_plan_map, get_subscription_plan_catalog
from app.core.mobi_slon_events import MOBI_SLON_EVENT_SET
from app.core.models.payment import AccessBinding, AccessToken, Order, PaymentEvent, PromoOffer, QuizSession, RestoreOTP
from app.core.notifications import TelegramSender, build_email_sender
from app.core.security import generate_otp, hash_value, make_access_token, mask_email, parse_access_token, utcnow
from app.services.entitlement_service import EntitlementService

logger = logging.getLogger("quiz.payments")
SAFE_CLICK_ID_RE = re.compile(r"[^a-zA-Z0-9_.-]")
SAFE_STATUS_RE = re.compile(r"^[a-z0-9_]{1,64}$")
SAFE_PARAM_KEY_RE = re.compile(r"^[a-zA-Z0-9_.-]{1,64}$")
SAFE_PROMO_CODE_RE = re.compile(r"^[A-Z0-9_-]{2,64}$")
QUESTION_COMPLETED_STATUS_RE = re.compile(r"^[1-9][0-9]{0,2}_question_completed$")
CHECKOUT_PLAN_SELECTED_STATUS_RE = re.compile(r"^checkout_plan_(7d|30d|90d)_selected$")


class MobiSlonPostbackResult(TypedDict):
    sent: bool
    upstream_url: str | None
    upstream_params: dict[str, str]
    upstream_status_code: int | None
    upstream_response_body: str | None
    error_class: str | None
    error_message: str | None
    attempt_count: int


class AttributionPayload(TypedDict):
    brand: str | None
    landing_id: str | None
    entry_host: str | None
    entry_path: str | None


class PaymentService:
    def __init__(self, settings: Settings, db: Session) -> None:
        self.settings = settings
        self.db = db
        self.plan_map = get_plan_map(settings)
        self.subscription_plans = get_subscription_plan_catalog(settings)
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
        if (
            status not in MOBI_SLON_EVENT_SET
            and not QUESTION_COMPLETED_STATUS_RE.match(status)
            and not CHECKOUT_PLAN_SELECTED_STATUS_RE.match(status)
            and status not in {"email_question_completed", "payment_started"}
        ):
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
    def _sanitize_text_field(raw_value: str | None, *, max_length: int) -> str | None:
        value = str(raw_value or "").strip()
        if not value:
            return None
        return value[:max_length]

    def sanitize_attribution(
        self,
        *,
        brand: str | None,
        landing_id: str | None,
        entry_host: str | None,
        entry_path: str | None,
    ) -> AttributionPayload:
        return {
            "brand": self._sanitize_text_field(brand, max_length=64),
            "landing_id": self._sanitize_text_field(landing_id, max_length=128),
            "entry_host": self._sanitize_text_field(entry_host, max_length=255),
            "entry_path": self._sanitize_text_field(entry_path, max_length=1024),
        }

    @staticmethod
    def _merge_attribution(
        base: Mapping[str, str | None] | None,
        override: Mapping[str, str | None] | None = None,
    ) -> AttributionPayload:
        base_payload = dict(base or {})
        override_payload = dict(override or {})
        return {
            "brand": override_payload.get("brand") or base_payload.get("brand"),
            "landing_id": override_payload.get("landing_id") or base_payload.get("landing_id"),
            "entry_host": override_payload.get("entry_host") or base_payload.get("entry_host"),
            "entry_path": override_payload.get("entry_path") or base_payload.get("entry_path"),
        }

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

    @staticmethod
    def _get_interval_count(plan: Any) -> int:
        return max(1, int(plan.interval_count or 1))

    @staticmethod
    def _get_billing_period(plan: Any) -> str:
        if plan.interval == "month" and max(1, int(plan.interval_count or 1)) == 12:
            return "year"
        return plan.interval or "lifetime"

    @staticmethod
    def normalize_promo_code(raw_promo_code: str | None) -> str | None:
        if raw_promo_code is None:
            return None
        normalized = raw_promo_code.strip().upper()
        if not normalized:
            return None
        if not SAFE_PROMO_CODE_RE.match(normalized):
            raise HTTPException(
                status_code=400,
                detail={"code": "promo_invalid", "message": "Promo code is invalid or inactive"},
            )
        return normalized

    @staticmethod
    def _daily_amount_from_minor(amount_minor: int, plan: Any) -> int | None:
        if plan.interval == "week":
            days = max(1, int(plan.interval_count or 1) * 7)
        elif plan.interval == "month":
            days = max(1, int(plan.interval_count or 1) * 30)
        else:
            return None
        return max(1, round(amount_minor / days))

    def _get_active_promo_offer(self, raw_promo_code: str | None) -> PromoOffer | None:
        promo_code = self.normalize_promo_code(raw_promo_code)
        if promo_code is None:
            return None
        offer = self.db.scalar(select(PromoOffer).where(PromoOffer.code == promo_code, PromoOffer.is_active.is_(True)))
        if offer is None:
            raise HTTPException(
                status_code=400,
                detail={"code": "promo_invalid", "message": "Promo code is invalid or inactive"},
            )
        return offer

    @staticmethod
    def _resolve_promo_amount_minor(plan_code: str, offer: PromoOffer) -> int | None:
        if plan_code == "sub_weekly":
            return offer.sub_weekly_amount_minor
        if plan_code == "sub_monthly":
            return offer.sub_monthly_amount_minor
        if plan_code == "sub_quarterly":
            return offer.sub_yearly_amount_minor
        if plan_code == "sub_yearly":
            return offer.sub_yearly_amount_minor
        return None

    def list_public_subscription_plans(self, promo_code: str | None = None) -> list[dict[str, Any]]:
        promo_offer = self._get_active_promo_offer(promo_code) if promo_code else None
        catalog: list[dict[str, Any]] = []
        for plan in sorted(self.subscription_plans, key=lambda item: (item.sort_order, item.code)):
            promo_amount_minor = self._resolve_promo_amount_minor(plan.code, promo_offer) if promo_offer else None
            has_promo = promo_amount_minor is not None
            current_currency = promo_offer.currency if promo_offer else plan.currency

            price_amount_minor = promo_amount_minor if has_promo else plan.amount_minor
            per_day_amount_minor = (
                self._daily_amount_from_minor(promo_amount_minor, plan)
                if has_promo
                else plan.per_day_amount_minor
            )

            compare_at_price_amount_minor = (
                plan.base_amount_minor
                if has_promo or plan.discount_percent > 0
                else None
            )
            compare_at_price = (
                {
                    "amount_minor": compare_at_price_amount_minor,
                    "currency": plan.currency,
                }
                if compare_at_price_amount_minor is not None
                else None
            )
            compare_at_per_day_amount_minor = (
                plan.base_per_day_amount_minor
                if plan.base_per_day_amount_minor is not None and (has_promo or plan.discount_percent > 0)
                else None
            )
            compare_at_per_day_price = (
                {
                    "amount_minor": compare_at_per_day_amount_minor,
                    "currency": plan.currency,
                }
                if compare_at_per_day_amount_minor is not None
                else None
            )

            catalog.append(
                {
                    "code": plan.code,
                    "headline": plan.headline or plan.product_name,
                    "billing_period": self._get_billing_period(plan),
                    "interval_unit": plan.interval or "lifetime",
                    "interval_count": self._get_interval_count(plan),
                    "price": {
                        "amount_minor": price_amount_minor,
                        "currency": current_currency,
                    },
                    "compare_at_price": compare_at_price,
                    "per_day_price": (
                        {
                            "amount_minor": per_day_amount_minor,
                            "currency": current_currency,
                        }
                        if per_day_amount_minor is not None
                        else None
                    ),
                    "compare_at_per_day_price": compare_at_per_day_price,
                    "badge": "PROMO" if has_promo else plan.badge,
                    "is_default": plan.is_default,
                    "is_highlighted": plan.is_highlighted,
                }
            )
        return catalog

    def resolve_session_currency(self, locale: str | None = None) -> dict[str, str]:
        normalized_locale = self.normalize_locale(locale)
        # Keep same currency as existing catalog to avoid breaking payment setup.
        fallback_currency = "usd"
        if self.subscription_plans:
            fallback_currency = (self.subscription_plans[0].currency or fallback_currency).lower()
        return {"currency": fallback_currency, "locale": normalized_locale}

    def create_quiz_session(
        self,
        *,
        locale: str | None,
        currency: str | None,
        clickid: str | None,
        brand: str | None,
        landing_id: str | None,
        entry_host: str | None,
        entry_path: str | None,
        tracking_params: Mapping[str, str] | None,
        answers: Mapping[str, Any] | None,
    ) -> str:
        resolved = self.resolve_session_currency(locale)
        clickid_value = self.sanitize_clickid((clickid or "").strip()) if clickid else "direct"
        payload_answers = dict(answers or {})
        attribution = self.sanitize_attribution(
            brand=brand,
            landing_id=landing_id,
            entry_host=entry_host,
            entry_path=entry_path,
        )
        session = QuizSession(
            locale=self.normalize_locale(locale),
            currency=(currency or resolved["currency"]).strip().lower() or resolved["currency"],
            brand=attribution["brand"],
            landing_id=attribution["landing_id"],
            entry_host=attribution["entry_host"],
            entry_path=attribution["entry_path"],
            clickid=clickid_value or "direct",
            tracking_params=self.sanitize_tracking_params(tracking_params),
            answers=payload_answers,
            checkout_state="created",
        )
        self.db.add(session)
        self.db.commit()
        return session.id

    def _get_quiz_session_or_404(self, session_uuid: str) -> QuizSession:
        session = self.db.scalar(select(QuizSession).where(QuizSession.id == session_uuid))
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")
        return session

    def update_quiz_session_email(self, *, session_uuid: str, email: str) -> None:
        session = self._get_quiz_session_or_404(session_uuid)
        session.email = email.strip().lower()
        session.checkout_state = "email_set"
        self.db.commit()

    def get_quiz_session_plan_data(self, *, session_uuid: str, promo_code: str | None) -> dict[str, Any]:
        session = self._get_quiz_session_or_404(session_uuid)
        return {
            "uuid": session.id,
            "locale": session.locale,
            "currency": session.currency,
            "email": session.email,
            "plans": self.list_public_subscription_plans(promo_code=promo_code),
        }

    def create_subscription_intent_for_quiz_session(
        self,
        *,
        session_uuid: str,
        plan: str,
        email: str,
        clickid: str | None,
        locale: str | None,
        telegram_chat_id: str | None,
        promo_code: str | None,
        brand: str | None,
        landing_id: str | None,
        entry_host: str | None,
        entry_path: str | None,
    ) -> tuple[str, str, str, str]:
        session = self._get_quiz_session_or_404(session_uuid)
        effective_email = (email or session.email or "").strip().lower()
        if not effective_email:
            raise HTTPException(status_code=400, detail="Email is required")
        session.email = effective_email
        session.checkout_state = "checkout_started"
        self.db.commit()
        attribution = self._merge_attribution(
            {
                "brand": session.brand,
                "landing_id": session.landing_id,
                "entry_host": session.entry_host,
                "entry_path": session.entry_path,
            },
            self.sanitize_attribution(
                brand=brand,
                landing_id=landing_id,
                entry_host=entry_host,
                entry_path=entry_path,
            ),
        )
        return self.create_subscription_intent(
            plan=plan,
            email=effective_email,
            clickid=(clickid or session.clickid or "direct"),
            locale=locale or session.locale,
            telegram_chat_id=telegram_chat_id,
            promo_code=promo_code,
            brand=attribution["brand"],
            landing_id=attribution["landing_id"],
            entry_host=attribution["entry_host"],
            entry_path=attribution["entry_path"],
        )

    def _build_success_url(self, locale: str | None) -> str:
        success_url = self.settings.build_pay_success_url(locale)
        if "?" in success_url:
            return f"{success_url}&session_id={{CHECKOUT_SESSION_ID}}"
        return f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}"

    def _resolve_order_payload(
        self,
        *,
        mode: str,
        plan: str,
        clickid: str,
        promo_code: str | None,
    ) -> tuple[str, Any, PromoOffer | None, int, str]:
        order_clickid = self.sanitize_clickid(clickid.strip())
        if not order_clickid:
            raise HTTPException(status_code=400, detail="Invalid clickid")

        plan_cfg = self.plan_map.get(plan)
        if plan_cfg is None:
            raise HTTPException(status_code=400, detail="Unknown plan")

        if mode == "subscription" and plan_cfg.interval is None:
            raise HTTPException(status_code=400, detail="Plan does not support subscription")
        if mode == "one_time" and plan_cfg.interval is not None:
            raise HTTPException(status_code=400, detail="Plan is subscription-only")

        promo_offer: PromoOffer | None = None
        applied_amount_minor = plan_cfg.amount_minor
        applied_currency = plan_cfg.currency
        normalized_promo_code = self.normalize_promo_code(promo_code)
        if normalized_promo_code:
            if mode != "subscription":
                raise HTTPException(
                    status_code=400,
                    detail={"code": "promo_invalid", "message": "Promo code is valid only for subscription plans"},
                )
            promo_offer = self._get_active_promo_offer(normalized_promo_code)
            if promo_offer is None:
                raise HTTPException(
                    status_code=400,
                    detail={"code": "promo_invalid", "message": "Promo code is invalid or inactive"},
                )
            promo_amount = self._resolve_promo_amount_minor(plan, promo_offer)
            if promo_amount is None:
                raise HTTPException(
                    status_code=400,
                    detail={"code": "promo_invalid", "message": "Promo code is invalid or inactive"},
                )
            applied_amount_minor = promo_amount
            applied_currency = promo_offer.currency

        return order_clickid, plan_cfg, promo_offer, applied_amount_minor, applied_currency

    def _build_order_metadata(self, *, order: Order, mode: str, plan: str, email: str, promo_offer: PromoOffer | None) -> dict[str, str]:
        metadata: dict[str, str] = {
            "order_id": order.id,
            "clickid": order.clickid,
            "plan": plan,
            "mode": mode,
            "email": email,
        }
        if order.brand:
            metadata["brand"] = order.brand
        if order.landing_id:
            metadata["landing_id"] = order.landing_id
        if promo_offer is not None:
            metadata["promo_code"] = promo_offer.code
        return metadata

    def _extract_token_activation_link(self, order: Order) -> str | None:
        token = self.db.scalar(
            select(AccessToken)
            .where(AccessToken.order_id == order.id, AccessToken.status == "issued")
            .order_by(desc(AccessToken.issued_at))
        )
        if token is None:
            return None
        token_value = make_access_token(token.id, self.settings.access_token_secret)
        return self.telegram_sender.build_deep_link(token_value)

    @staticmethod
    def _stripe_get(obj: Any, key: str) -> Any:
        if obj is None:
            return None
        if isinstance(obj, dict):
            return obj.get(key)
        return getattr(obj, key, None)

    def _get_or_create_customer(self, email: str) -> str:
        try:
            existing = stripe.Customer.list(email=email, limit=1)
            existing_data = self._stripe_get(existing, "data") or []
            if existing_data:
                customer_id = self._stripe_get(existing_data[0], "id")
                if isinstance(customer_id, str) and customer_id:
                    return customer_id
            created = stripe.Customer.create(email=email)
            created_id = self._stripe_get(created, "id")
            if not isinstance(created_id, str) or not created_id:
                raise HTTPException(status_code=502, detail="Stripe did not return customer id")
            return created_id
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Stripe error: {exc}") from exc

    def _get_or_create_product(self, product_name: str) -> str:
        try:
            products = stripe.Product.list(active=True, limit=100)
            for product in self._stripe_get(products, "data") or []:
                if self._stripe_get(product, "name") == product_name:
                    product_id = self._stripe_get(product, "id")
                    if isinstance(product_id, str) and product_id:
                        return product_id

            created = stripe.Product.create(name=product_name)
            created_id = self._stripe_get(created, "id")
            if not isinstance(created_id, str) or not created_id:
                raise HTTPException(status_code=502, detail="Stripe did not return product id")
            return created_id
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Stripe error: {exc}") from exc

    def create_checkout_session(
        self,
        *,
        mode: str,
        plan: str,
        email: str,
        clickid: str,
        locale: str | None,
        telegram_chat_id: str | None,
        promo_code: str | None,
        brand: str | None,
        landing_id: str | None,
        entry_host: str | None,
        entry_path: str | None,
    ) -> tuple[str, str, str]:
        order_clickid, plan_cfg, promo_offer, applied_amount_minor, applied_currency = self._resolve_order_payload(
            mode=mode,
            plan=plan,
            clickid=clickid,
            promo_code=promo_code,
        )
        attribution = self.sanitize_attribution(
            brand=brand,
            landing_id=landing_id,
            entry_host=entry_host,
            entry_path=entry_path,
        )

        order = Order(
            email=email,
            brand=attribution["brand"],
            landing_id=attribution["landing_id"],
            entry_host=attribution["entry_host"],
            entry_path=attribution["entry_path"],
            clickid=order_clickid,
            telegram_chat_id=telegram_chat_id,
            mode=mode,
            plan=plan,
            promo_code=promo_offer.code if promo_offer else None,
            locale=self.normalize_locale(locale),
            amount_minor=applied_amount_minor,
            currency=applied_currency,
            status="created",
        )
        self.db.add(order)
        self.db.flush()

        line_item: dict[str, Any] = {
            "price_data": {
                "currency": applied_currency,
                "unit_amount": applied_amount_minor,
                "product_data": {"name": plan_cfg.product_name},
            },
            "quantity": 1,
        }
        stripe_mode: Literal["payment", "subscription"] = "payment"
        if mode == "subscription":
            stripe_mode = "subscription"
            line_item["price_data"]["recurring"] = {
                "interval": plan_cfg.interval,
                "interval_count": max(1, plan_cfg.interval_count),
            }

        metadata = self._build_order_metadata(order=order, mode=mode, plan=plan, email=email, promo_offer=promo_offer)

        try:
            session = stripe.checkout.Session.create(
                mode=stripe_mode,
                line_items=cast(list[Any], [line_item]),
                success_url=self._build_success_url(locale),
                cancel_url=self.settings.build_pay_cancel_url(locale),
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

    def create_subscription_intent(
        self,
        *,
        plan: str,
        email: str,
        clickid: str,
        locale: str | None,
        telegram_chat_id: str | None,
        promo_code: str | None,
        brand: str | None,
        landing_id: str | None,
        entry_host: str | None,
        entry_path: str | None,
    ) -> tuple[str, str, str, str]:
        if not self.settings.stripe_publishable_key.strip():
            raise HTTPException(status_code=503, detail="Stripe publishable key is not configured")

        order_clickid, plan_cfg, promo_offer, applied_amount_minor, applied_currency = self._resolve_order_payload(
            mode="subscription",
            plan=plan,
            clickid=clickid,
            promo_code=promo_code,
        )
        attribution = self.sanitize_attribution(
            brand=brand,
            landing_id=landing_id,
            entry_host=entry_host,
            entry_path=entry_path,
        )

        order = Order(
            email=email,
            brand=attribution["brand"],
            landing_id=attribution["landing_id"],
            entry_host=attribution["entry_host"],
            entry_path=attribution["entry_path"],
            clickid=order_clickid,
            telegram_chat_id=telegram_chat_id,
            mode="subscription",
            plan=plan,
            promo_code=promo_offer.code if promo_offer else None,
            locale=self.normalize_locale(locale),
            amount_minor=applied_amount_minor,
            currency=applied_currency,
            status="created",
        )
        self.db.add(order)
        self.db.flush()

        metadata = self._build_order_metadata(order=order, mode="subscription", plan=plan, email=email, promo_offer=promo_offer)
        try:
            customer_id = self._get_or_create_customer(email)
            product_id = self._get_or_create_product(plan_cfg.product_name)
            subscription = stripe.Subscription.create(
                customer=customer_id,
                payment_behavior="default_incomplete",
                payment_settings={"save_default_payment_method": "on_subscription"},
                items=[
                    {
                        "price_data": {
                            "currency": applied_currency,
                            "unit_amount": applied_amount_minor,
                            "product": product_id,
                            "recurring": {
                                "interval": plan_cfg.interval,
                                "interval_count": max(1, plan_cfg.interval_count),
                            },
                        }
                    }
                ],
                metadata=metadata,
                expand=["latest_invoice.payment_intent", "latest_invoice.confirmation_secret", "pending_setup_intent"],
            )
        except Exception as exc:
            self.db.rollback()
            raise HTTPException(status_code=502, detail=f"Stripe error: {exc}") from exc

        subscription_id = self._stripe_get(subscription, "id")
        latest_invoice = self._stripe_get(subscription, "latest_invoice")
        confirmation_secret = self._stripe_get(latest_invoice, "confirmation_secret")
        client_secret = self._stripe_get(confirmation_secret, "client_secret")
        payment_intent = self._stripe_get(latest_invoice, "payment_intent")
        payment_intent_id = self._stripe_get(payment_intent, "id")
        if not isinstance(client_secret, str) or not client_secret:
            client_secret = self._stripe_get(payment_intent, "client_secret")
        if (not isinstance(client_secret, str) or not client_secret) and self._stripe_get(subscription, "pending_setup_intent"):
            pending_setup_intent = self._stripe_get(subscription, "pending_setup_intent")
            client_secret = self._stripe_get(pending_setup_intent, "client_secret")
        if not isinstance(client_secret, str) or not client_secret:
            self.db.rollback()
            raise HTTPException(status_code=502, detail="Stripe did not return payment client_secret")

        order.stripe_customer_id = customer_id
        if isinstance(subscription_id, str):
            order.stripe_subscription_id = subscription_id
        if isinstance(payment_intent_id, str):
            order.stripe_payment_intent_id = payment_intent_id
        order.status = "intent_created"
        self.db.commit()
        return order.id, client_secret, customer_id, self.settings.stripe_publishable_key.strip()

    def get_session_status(self, session_id: str) -> dict[str, str | None]:
        order = self.db.scalar(select(Order).where(Order.stripe_session_id == session_id))
        if order is None:
            raise HTTPException(status_code=404, detail="Session not found")

        return {
            "payment_status": order.status,
            "fulfillment_status": order.fulfillment_status,
            "access_status": order.access_status,
            "activation_link": self._extract_token_activation_link(order),
        }

    def get_order_status(self, order_id: str) -> dict[str, str | None]:
        order = self.db.scalar(select(Order).where(Order.id == order_id))
        if order is None:
            raise HTTPException(status_code=404, detail="Order not found")

        return {
            "payment_status": order.status,
            "fulfillment_status": order.fulfillment_status,
            "access_status": order.access_status,
            "activation_link": self._extract_token_activation_link(order),
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
                return_url=self.settings.build_pay_manage_url(order.locale),
            )
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Stripe error: {exc}") from exc
        return session.url

    def handle_webhook(self, payload: bytes, signature: str | None) -> tuple[dict[str, bool], MobiSlonPostbackResult | None]:
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
            return {"ok": True, "duplicate": True}, None

        payment_event = PaymentEvent(
            stripe_event_id=event_id,
            event_type=event_type,
            payload_json=event,
            process_result="processed",
        )
        self.db.add(payment_event)

        obj = event["data"]["object"]
        postback_payload: tuple[str, str] | None = None

        if event_type == "checkout.session.completed":
            postback_payload = self._on_checkout_session_completed(obj)
        elif event_type == "checkout.session.expired":
            self._update_order_status_by_session(obj.get("id"), status="expired")
        elif event_type == "payment_intent.succeeded":
            order = self._find_order_by_payment_intent(obj.get("id"))
            if order is not None:
                order.status = "paid"
                customer_id = obj.get("customer")
                if isinstance(customer_id, str) and customer_id:
                    order.stripe_customer_id = customer_id
                self._ensure_access_delivery(order)
        elif event_type == "payment_intent.payment_failed":
            self._update_order_status_by_payment_intent(obj.get("id"), status="failed")
        elif event_type == "invoice.paid":
            period_end_ts = (((obj.get("lines") or {}).get("data") or [{}])[0].get("period") or {}).get("end")
            order = self._find_order_by_subscription(obj.get("subscription"), obj.get("customer"))
            was_paid_before = bool(order is not None and order.status == "paid")
            self._apply_subscription_access_update(
                order=order,
                payment_status="paid",
                access_status="active",
                binding_status="active",
                current_period_end_ts=period_end_ts,
            )
            if order is not None:
                self._ensure_access_delivery(order)
                # New quiz checkout uses intent/subscription flow and may not emit
                # checkout.session.completed. Send pay_success here once on first paid transition.
                if not was_paid_before and not order.stripe_session_id:
                    postback_payload = (order.clickid, self._format_amount_minor(order.amount_minor, order.currency))
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
        if postback_payload:
            postback_result = self._send_mobi_slon_postback(
                status="pay_success",
                clickid=postback_payload[0],
                extra_params={"payout": postback_payload[1]},
                source="stripe_webhook",
            )
            return {"ok": True, "duplicate": False}, postback_result
        return {"ok": True, "duplicate": False}, None

    def relay_mobi_slon_event(
        self,
        *,
        status: str,
        clickid: str,
        tracking_params: Mapping[str, str] | None,
        session_id: str | None,
        page_path: str | None,
    ) -> MobiSlonPostbackResult:
        normalized_status = self.normalize_postback_status(status)
        sanitized_clickid = self.sanitize_clickid(clickid.strip())
        if not sanitized_clickid:
            raise HTTPException(status_code=400, detail="Invalid clickid")

        if normalized_status == "pay_success":
            logger.warning("mobi_slon_relay_skipped status=%s source=frontend_relay reason=reserved_server_side", normalized_status)
            return {
                "sent": False,
                "upstream_url": None,
                "upstream_params": {},
                "upstream_status_code": None,
                "upstream_response_body": None,
                "error_class": "ReservedServerSideStatus",
                "error_message": "pay_success can be sent only from stripe_webhook",
                "attempt_count": 0,
            }

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
            logger.warning("otp_delivery_failed email=%s error=%s", mask_email(email), str(exc))
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
        return EntitlementService(self.db).resolve_bot_access_status(telegram_user_id)

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

    def _find_order_by_payment_intent(self, payment_intent_id: str | None) -> Order | None:
        if not payment_intent_id:
            return None
        return self.db.scalar(select(Order).where(Order.stripe_payment_intent_id == payment_intent_id))

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

    def _on_checkout_session_completed(self, session_obj: dict) -> tuple[str, str] | None:
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
        self._ensure_access_delivery(order)
        logger.info(
            "checkout_session_completed order_id=%s session_id=%s clickid=%s fulfillment_status=%s access_status=%s",
            order.id,
            order.stripe_session_id,
            order.clickid,
            order.fulfillment_status,
            order.access_status,
        )
        return (order.clickid, self._format_amount_minor(order.amount_minor, order.currency))

    def _ensure_access_delivery(self, order: Order) -> None:
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

        should_send = order.fulfillment_status in {"none", "pending"}
        email_ok = True
        telegram_ok = True
        if should_send:
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

            if order.telegram_chat_id:
                telegram_ok = self.telegram_sender.send_activation_message(chat_id=order.telegram_chat_id, token=token_value)

        if should_send:
            order.fulfillment_status = "done" if telegram_ok and email_ok else "partial"
        if order.access_status in {"none", "pending", "expired", "revoked"}:
            order.access_status = "token_issued"

    def _send_mobi_slon_postback(
        self,
        *,
        status: str,
        clickid: str,
        extra_params: Mapping[str, str] | None = None,
        source: str = "unknown",
    ) -> MobiSlonPostbackResult:
        postback_base_url = self.settings.mobi_slon_postback_url.strip()
        if not postback_base_url:
            logger.warning("mobi_slon_postback_skipped_missing_url status=%s source=%s", status, source)
            return {
                "sent": False,
                "upstream_url": None,
                "upstream_params": {},
                "upstream_status_code": None,
                "upstream_response_body": None,
                "error_class": "MissingPostbackUrl",
                "error_message": "mobi_slon_postback_url is not configured",
                "attempt_count": 0,
            }

        request_params: dict[str, str] = {"cnv_id": clickid, "payout": "0", "cnv_status": status}
        if extra_params:
            request_params.update(extra_params)

        last_error: Exception | None = None
        last_status_code: int | None = None
        last_response_body: str | None = None
        # Frontend relay events must be delivered at most once to avoid duplicate
        # conversions when the upstream accepts the request but the response is lost.
        max_attempts = 1 if source == "frontend_relay" else 3
        for attempt in range(1, max_attempts + 1):
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
                last_status_code = response.status_code
                last_response_body = response.text[:1000]
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
                    return {
                        "sent": True,
                        "upstream_url": postback_base_url,
                        "upstream_params": request_params,
                        "upstream_status_code": response.status_code,
                        "upstream_response_body": last_response_body,
                        "error_class": None,
                        "error_message": None,
                        "attempt_count": attempt,
                    }
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
        return {
            "sent": False,
            "upstream_url": postback_base_url,
            "upstream_params": request_params,
            "upstream_status_code": last_status_code,
            "upstream_response_body": last_response_body,
            "error_class": last_error.__class__.__name__ if last_error else None,
            "error_message": str(last_error) if last_error else None,
            "attempt_count": max_attempts,
        }
