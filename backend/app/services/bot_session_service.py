from __future__ import annotations

import base64
from datetime import datetime
import logging
from typing import Any

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.models.payment import BotContextAsset, BotGenerationRun, BotSession, utcnow
from app.schemas.bot import (
    BotSessionAssetRequest,
    BotSessionBatchCloseResponse,
    BotSessionConfirmContextRequest,
    BotSessionGenerateRequest,
    BotSessionRefineRequest,
    BotUiPayloadAnalyzeCase,
    BotUiPayloadWriteNow,
)
from app.services.openai_bot import OpenAIBotClient

logger = logging.getLogger("quiz.bot_sessions")


def _format_lines(items: list[str], prefix: str = "- ") -> str:
    return "\n".join(f"{prefix}{item}" for item in items if item)


class BotSessionService:
    def __init__(self, settings: Settings, db: Session) -> None:
        self.settings = settings
        self.db = db
        self.openai = OpenAIBotClient(settings)

    def _close_active_sessions(self, telegram_user_id: str) -> None:
        active_sessions = self.db.scalars(
            select(BotSession)
            .where(BotSession.telegram_user_id == telegram_user_id, BotSession.status == "active")
            .order_by(desc(BotSession.updated_at))
        ).all()
        for item in active_sessions:
            item.status = "closed"
            item.state = "closed"
            item.closed_at = utcnow()

    def start_session(self, *, telegram_user_id: str, mode: str) -> BotSession:
        self._close_active_sessions(telegram_user_id)
        session = BotSession(
            telegram_user_id=telegram_user_id,
            mode=mode,
            state="collecting_context",
            status="active",
            current_batch_no=1,
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def _get_session_for_user(self, session_id: str, telegram_user_id: str) -> BotSession:
        session = self.db.scalar(select(BotSession).where(BotSession.id == session_id))
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")
        if session.telegram_user_id != telegram_user_id:
            raise HTTPException(status_code=403, detail="Session ownership mismatch")
        if session.status != "active":
            raise HTTPException(status_code=400, detail="Session is closed")
        return session

    def _decode_media(self, content_base64: str) -> bytes:
        try:
            decoded = base64.b64decode(content_base64, validate=True)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=400, detail="Invalid base64 media payload") from exc
        if len(decoded) > self.settings.bot_media_max_bytes:
            raise HTTPException(status_code=400, detail="Media payload exceeds BOT_MEDIA_MAX_BYTES")
        return decoded

    def transcribe_media(self, *, asset_type: str, payload: dict[str, Any]) -> str:
        media = payload.get("media") or {}
        mime_type = str(media.get("mime_type") or "").strip()
        content_base64 = str(media.get("content_base64") or "").strip()
        if not mime_type or not content_base64:
            raise HTTPException(status_code=400, detail="media.mime_type and media.content_base64 are required")

        content_bytes = self._decode_media(content_base64)
        if asset_type == "image":
            return self.openai.ocr_image(mime_type=mime_type, content_bytes=content_bytes)
        if asset_type == "audio":
            file_name = str(media.get("file_name") or "audio.ogg")
            return self.openai.transcribe_audio(file_name=file_name, mime_type=mime_type, content_bytes=content_bytes)
        raise HTTPException(status_code=400, detail="Unsupported media asset_type")

    def append_asset(self, *, session_id: str, payload: BotSessionAssetRequest) -> BotContextAsset:
        session = self._get_session_for_user(session_id, payload.telegram_user_id)
        if session.state not in {"collecting_context", "awaiting_context_confirmation"}:
            raise HTTPException(status_code=400, detail="Session is not collecting context")

        source_kind = "text"
        parse_confidence = 0.98
        needs_confirmation = False
        role_ambiguity = False
        summary_for_user = ""
        extracted_text = ""
        extraction_meta: dict[str, Any] = {"asset_type": payload.asset_type}

        if payload.asset_type in {"text", "forward"}:
            extracted_text = (payload.payload.text or "").strip()
            source_kind = "forward" if payload.asset_type == "forward" else "text"
            if payload.asset_type == "forward":
                raw_role = (payload.payload.role or "").strip().lower()
                role = "USER_PEER"
                if raw_role in {"user_self", "пользователь", "user", "self"}:
                    role = "USER_SELF"
                elif raw_role in {"user_peer", "собеседник", "peer", "other"}:
                    role = "USER_PEER"
                sent_at = (payload.payload.sent_at or "").strip()
                display_name = (payload.payload.display_name or "").strip()
                sent_at_block = f"[sent_at:{sent_at}]" if sent_at else ""
                name_block = f"[name:{display_name}]" if display_name else ""
                forward_tags = "[forward]" + f"[role:{role}]{name_block}{sent_at_block}"
                extracted_text = f"[FORWARD role={role}] {name_block} {sent_at_block} {extracted_text}".strip()
                summary_for_user = f"[text]{forward_tags} {(payload.payload.text or '').strip()}".strip()
                extraction_meta.update({"role": role, "display_name": display_name or None, "sent_at": sent_at or None})
            else:
                summary_for_user = f"[text] {extracted_text}".strip()
        elif payload.asset_type in {"image", "audio"}:
            media_payload = payload.payload.media
            if media_payload is None:
                raise HTTPException(status_code=400, detail="payload.media is required for image/audio")
            content_bytes = self._decode_media(media_payload.content_base64)
            extraction_meta.update(
                {
                    "mime_type": media_payload.mime_type,
                    "byte_size": len(content_bytes),
                    "file_name": media_payload.file_name,
                }
            )
            if payload.asset_type == "image":
                extracted_text = self.openai.ocr_image(mime_type=media_payload.mime_type, content_bytes=content_bytes)
                source_kind = "openai_vision"
                summary_prefix = "[media]"
            else:
                extracted_text = self.openai.transcribe_audio(
                    file_name=media_payload.file_name or "audio.ogg",
                    mime_type=media_payload.mime_type,
                    content_bytes=content_bytes,
                )
                source_kind = "openai_stt"
                summary_prefix = "[audio]"

            raw_role = (payload.payload.role or "").strip().lower()
            if raw_role:
                role = "USER_PEER"
                if raw_role in {"user_self", "пользователь", "user", "self"}:
                    role = "USER_SELF"
                elif raw_role in {"user_peer", "собеседник", "peer", "other"}:
                    role = "USER_PEER"
                sent_at = (payload.payload.sent_at or "").strip()
                display_name = (payload.payload.display_name or "").strip()
                sent_at_block = f"[sent_at:{sent_at}]" if sent_at else ""
                name_block = f"[name:{display_name}]" if display_name else ""
                forward_tags = "[forward]" + f"[role:{role}]{name_block}{sent_at_block}"
                summary_for_user = f"{summary_prefix}{forward_tags} {extracted_text}".strip()
                extraction_meta.update({"role": role, "display_name": display_name or None, "sent_at": sent_at or None})
            else:
                summary_for_user = f"{summary_prefix} {extracted_text}".strip()
            parse_confidence = 0.76
            needs_confirmation = True
            role_ambiguity = "?" in extracted_text
        else:
            raise HTTPException(status_code=400, detail="Unsupported asset_type")

        asset = BotContextAsset(
            session_id=session.id,
            batch_no=session.current_batch_no,
            asset_type=payload.asset_type,
            source_kind=source_kind,
            telegram_message_id=payload.telegram_message_id,
            extracted_text=extracted_text,
            parse_confidence=parse_confidence,
            needs_confirmation=needs_confirmation,
            role_ambiguity=role_ambiguity,
            summary_for_user=summary_for_user,
            extraction_meta=extraction_meta,
        )
        self.db.add(asset)

        if session.state == "awaiting_context_confirmation":
            session.state = "collecting_context"

        self.db.commit()
        self.db.refresh(asset)
        return asset

    def close_batch(self, *, session_id: str, telegram_user_id: str) -> BotSessionBatchCloseResponse:
        session = self._get_session_for_user(session_id, telegram_user_id)
        assets = self.db.scalars(
            select(BotContextAsset)
            .where(BotContextAsset.session_id == session.id, BotContextAsset.batch_no == session.current_batch_no)
            .order_by(BotContextAsset.created_at)
        ).all()
        if not assets:
            raise HTTPException(status_code=400, detail="No context provided for current batch")

        needs_confirmation = any(item.needs_confirmation for item in assets)
        session.state = "awaiting_context_confirmation" if needs_confirmation else "ready_to_generate"
        full_summary = self._build_context_text(session.id)
        context_preview = full_summary
        self.db.commit()

        return BotSessionBatchCloseResponse(
            session_id=session.id,
            state=session.state,
            needs_confirmation=needs_confirmation,
            context_preview=context_preview,
        )

    def confirm_context(self, *, session_id: str, payload: BotSessionConfirmContextRequest) -> tuple[str, bool]:
        session = self._get_session_for_user(session_id, payload.telegram_user_id)

        if payload.action == "confirm:yes":
            session.state = "ready_to_generate"
            self.db.commit()
            return session.state, True

        if payload.action == "confirm:edit":
            edit_text = (payload.edit_text or "").strip()
            if not edit_text:
                raise HTTPException(status_code=400, detail="edit_text is required for confirm:edit")
            session.current_batch_no += 1
            session.state = "collecting_context"
            asset = BotContextAsset(
                session_id=session.id,
                batch_no=session.current_batch_no,
                asset_type="text",
                source_kind="user_edit",
                extracted_text=f"Уточнение пользователя: {edit_text}",
                parse_confidence=1.0,
                needs_confirmation=False,
                role_ambiguity=False,
                summary_for_user=f"[text][edit] {edit_text}",
                extraction_meta={"source": "confirm_edit"},
            )
            self.db.add(asset)
            self.db.commit()
            return session.state, False

        raise HTTPException(status_code=400, detail="Unsupported confirm action")

    def _build_context_text(self, session_id: str) -> str:
        assets = self.db.scalars(
            select(BotContextAsset)
            .where(BotContextAsset.session_id == session_id)
            .order_by(BotContextAsset.created_at)
        ).all()

        def _sort_key(item: BotContextAsset) -> tuple[datetime, datetime]:
            created_at = item.created_at
            raw_sent_at = None
            if isinstance(item.extraction_meta, dict):
                raw_sent_at = item.extraction_meta.get("sent_at")
            parsed_sent_at = self._safe_parse_iso_datetime(str(raw_sent_at)) if raw_sent_at else None
            if parsed_sent_at is not None:
                return parsed_sent_at, created_at
            return created_at, created_at

        sorted_assets = sorted(assets, key=_sort_key)
        chunks = [((item.summary_for_user or item.extracted_text) or "").strip() for item in sorted_assets]
        chunks = [item for item in chunks if item]
        if not chunks:
            raise HTTPException(status_code=400, detail="Session context is empty")
        return "\n".join(chunks)

    def _generate_prompt_write_now(self, request: BotSessionGenerateRequest, context: str) -> str:
        constraints = ", ".join(request.constraints) if request.constraints else "нет"
        offline = request.offline_first_message.model_dump() if request.offline_first_message else {}
        tone = request.tone or "уверенный, спокойный"
        target = request.target_outcome or "получить содержательный ответ и продолжить общение"
        return (
            "Сформируй JSON для схемы WriteNowResponseSchema.\n"
            "Домен: знакомство/общение/соблазнение с девушкой.\n"
            f"Сценарий: {request.scenario}\n"
            f"Цель: {target}\n"
            f"Тон: {tone}\n"
            f"Ограничения: {constraints}\n"
            f"Контекст пользователя (саммари с источником и метаданными): {context}\n"
            f"offline_first_message: {offline}\n"
            "Требования:\n"
            "- Ответ только JSON, без markdown.\n"
            "- Разрешены только ключи: primary_message, why, risks, avoid_list, next_step, fallback_simple_version, alternatives.\n"
            "- Запрещены вложенные обертки response/write_now/meta и любые лишние ключи.\n"
            "- avoid_list ровно 3 пункта.\n"
            "- risks минимум 1 пункт.\n"
            "- risks должен быть массивом строк (не объектов).\n"
            "- Тон живой и уважительный, без манипуляций, без токсичности, без давления."
        )

    def _generate_prompt_analyze_case(self, request: BotSessionGenerateRequest, context: str) -> str:
        constraints = ", ".join(request.constraints) if request.constraints else "нет"
        tried_actions = ", ".join(request.tried_actions) if request.tried_actions else "ничего"
        target = request.target_outcome or "снизить напряжение и вернуть диалог"
        return (
            "Сформируй JSON для схемы AnalyzeCaseResponseSchema.\n"
            "Домен: знакомство/общение/соблазнение с девушкой.\n"
            f"Цель: {target}\n"
            f"Что уже пробовали: {tried_actions}\n"
            f"Ограничения: {constraints}\n"
            f"Контекст пользователя (саммари с источником и метаданными): {context}\n"
            "Требования:\n"
            "- Ответ только JSON, без markdown.\n"
            "- Разрешены только ключи: diagnosis, core_leverage, plan_24h, plan_if_reply, plan_if_no_reply, message_template, avoid_list.\n"
            "- Запрещены любые лишние ключи и вложенные обертки.\n"
            "- plan_24h, plan_if_reply, plan_if_no_reply: минимум по 1 пункту.\n"
            "- avoid_list: минимум 3 пункта.\n"
            "- Все элементы plan_* и avoid_list должны быть строками.\n"
            "- Каждый элемент plan_* должен быть одним конкретным действием в повелительной форме и начинаться с глагола (например: «Отправь...», «Уточни...», «Предложи...»).\n"
            "- Не начинай элементы plan_* с вводных конструкций «Если...», «Когда...», «В случае...». Условия можно писать после глагола.\n"
            "- Каждый элемент plan_* должен быть не короче 6 слов и содержать конкретику (что сделать + с какой целью/в какие сроки).\n"
            "- Пиши конкретные действия, без обвинений, без давления, без манипуляций."
        )

    def generate(self, *, session_id: str, payload: BotSessionGenerateRequest) -> dict[str, Any]:
        session = self._get_session_for_user(session_id, payload.telegram_user_id)
        if session.state not in {"ready_to_generate", "awaiting_refinement"}:
            raise HTTPException(status_code=400, detail="Session is not ready to generate")

        context = self._build_context_text(session_id)
        if session.mode == "write_now":
            prompt = self._generate_prompt_write_now(payload, context)
            raw = self.openai.generate_write_now(prompt)
            try:
                ui_payload = BotUiPayloadWriteNow(**raw).model_dump()
            except ValidationError as exc:
                raise HTTPException(status_code=502, detail=f"OpenAI write_now schema mismatch: {exc}") from exc
        elif session.mode == "analyze_case":
            prompt = self._generate_prompt_analyze_case(payload, context)
            raw = self.openai.generate_analyze_case(prompt)
            try:
                ui_payload = BotUiPayloadAnalyzeCase(**raw).model_dump()
            except ValidationError as exc:
                raise HTTPException(status_code=502, detail=f"OpenAI analyze_case schema mismatch: {exc}") from exc
        else:
            raise HTTPException(status_code=400, detail="Unsupported session mode")

        session.state = "awaiting_refinement"
        run = BotGenerationRun(
            session_id=session.id,
            kind="generate",
            request_payload=payload.model_dump(),
            response_payload=ui_payload,
            llm_provider="openai",
            model_name=self.settings.bot_openai_model_generate,
        )
        self.db.add(run)
        self.db.commit()

        return {
            "session_id": session.id,
            "mode": session.mode,
            "state": session.state,
            "next_step": "refine_or_finish",
            "llm_provider": "openai",
            "model_name": self.settings.bot_openai_model_generate,
            "ui_payload": ui_payload,
        }

    def refine(self, *, session_id: str, payload: BotSessionRefineRequest) -> dict[str, Any]:
        session = self._get_session_for_user(session_id, payload.telegram_user_id)
        if session.state != "awaiting_refinement":
            raise HTTPException(status_code=400, detail="Session is not awaiting refinement")

        latest_generate = self.db.scalar(
            select(BotGenerationRun)
            .where(BotGenerationRun.session_id == session.id)
            .order_by(desc(BotGenerationRun.created_at))
        )
        if latest_generate is None:
            raise HTTPException(status_code=400, detail="No generation result to refine")

        base_text = ""
        response_payload = latest_generate.response_payload or {}
        if isinstance(response_payload, dict):
            base_text = str(response_payload.get("primary_message") or response_payload.get("message_template") or "")

        refine_prompt = (
            "Верни только JSON-объект без markdown с ключами:\n"
            "- primary_message (str)\n"
            "- why (str)\n"
            "- fallback_simple_version (str)\n"
            "- alternatives (array of str, можно пустой)\n"
            f"Исходное сообщение: {base_text}\n"
            f"Уточнения пользователя: {payload.command}\n"
            "Требования:\n"
            "- Сохрани намерение исходного сообщения.\n"
            "- Учти все уточнения пользователя.\n"
            "- primary_message <= 420 символов.\n"
            "- Ответ на русском."
        )
        raw = self.openai.refine_message(refine_prompt)
        primary_message = str(raw.get("primary_message") or "").strip()
        why = str(raw.get("why") or "").strip()
        fallback_simple_version = str(raw.get("fallback_simple_version") or "").strip()
        alternatives = raw.get("alternatives") or []
        if not primary_message or not why or not fallback_simple_version or not isinstance(alternatives, list):
            raise HTTPException(status_code=502, detail="OpenAI refine schema mismatch")

        ui_payload = {
            "primary_message": primary_message,
            "why": why,
            "risks": response_payload.get("risks", []) if isinstance(response_payload, dict) else [],
            "avoid_list": response_payload.get("avoid_list", []) if isinstance(response_payload, dict) else [],
            "next_step": "Уточните или завершите",
            "fallback_simple_version": fallback_simple_version,
            "alternatives": [str(item) for item in alternatives],
        }

        run = BotGenerationRun(
            session_id=session.id,
            kind="refine",
            request_payload=payload.model_dump(),
            response_payload=ui_payload,
            llm_provider="openai",
            model_name=self.settings.bot_openai_model_generate,
        )
        self.db.add(run)
        self.db.commit()

        return {
            "session_id": session.id,
            "mode": session.mode,
            "state": session.state,
            "llm_provider": "openai",
            "model_name": self.settings.bot_openai_model_generate,
            "ui_payload": ui_payload,
            "primary_message": primary_message,
            "why": why,
            "fallback_simple_version": fallback_simple_version,
            "next_step": "refine_or_finish",
            "alternatives": [str(item) for item in alternatives],
        }

    def reset(self, *, session_id: str, telegram_user_id: str) -> BotSession:
        session = self._get_session_for_user(session_id, telegram_user_id)
        session.status = "closed"
        session.state = "closed"
        session.closed_at = utcnow()
        self.db.commit()
        return session

    def reset_active(self, *, telegram_user_id: str) -> int:
        active_sessions = self.db.scalars(
            select(BotSession)
            .where(BotSession.telegram_user_id == telegram_user_id, BotSession.status == "active")
            .order_by(desc(BotSession.updated_at))
        ).all()
        if not active_sessions:
            return 0
        for item in active_sessions:
            item.status = "closed"
            item.state = "closed"
            item.closed_at = utcnow()
        self.db.commit()
        return len(active_sessions)

    def render_ui_text(self, ui_payload: dict[str, Any], mode: str) -> str:
        if mode == "write_now":
            risks = _format_lines([str(item) for item in ui_payload.get("risks") or []])
            alternatives = _format_lines([str(item) for item in ui_payload.get("alternatives") or []])
            avoid_list = _format_lines([str(item) for item in ui_payload.get("avoid_list") or []])
            return (
                f"Сообщение:\n{ui_payload.get('primary_message', '')}\n\n"
                f"Почему так:\n{ui_payload.get('why', '')}\n\n"
                f"Риски:\n{risks or '- нет'}\n\n"
                f"Чего избегать:\n{avoid_list or '- нет'}\n\n"
                f"Следующий шаг:\n{ui_payload.get('next_step', '')}\n\n"
                f"Упрощенный вариант:\n{ui_payload.get('fallback_simple_version', '')}\n\n"
                f"Альтернативы:\n{alternatives or '- нет'}"
            )

        plan24 = _format_lines([str(item) for item in ui_payload.get("plan_24h") or []])
        plan_reply = _format_lines([str(item) for item in ui_payload.get("plan_if_reply") or []])
        plan_no_reply = _format_lines([str(item) for item in ui_payload.get("plan_if_no_reply") or []])
        avoid_list = _format_lines([str(item) for item in ui_payload.get("avoid_list") or []])
        return (
            f"Диагноз:\n{ui_payload.get('diagnosis', '')}\n\n"
            f"Точка рычага:\n{ui_payload.get('core_leverage', '')}\n\n"
            f"План на 24ч:\n{plan24 or '- нет'}\n\n"
            f"Если ответит:\n{plan_reply or '- нет'}\n\n"
            f"Если не ответит:\n{plan_no_reply or '- нет'}\n\n"
            f"Шаблон сообщения:\n{ui_payload.get('message_template', '')}\n\n"
            f"Чего избегать:\n{avoid_list or '- нет'}"
        )
    @staticmethod
    def _safe_parse_iso_datetime(value: str | None) -> datetime | None:
        if not value:
            return None
        text = value.strip()
        if not text:
            return None
        try:
            if text.endswith("Z"):
                text = f"{text[:-1]}+00:00"
            return datetime.fromisoformat(text)
        except ValueError:
            return None
