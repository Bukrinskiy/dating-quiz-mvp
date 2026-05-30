from __future__ import annotations

import base64
from datetime import datetime
import logging
import re
from typing import Any

from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import and_, desc, or_, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.models.payment import BotContextAsset, BotGenerationRun, BotSession, utcnow
from app.schemas.bot import (
    BotAssetPayload,
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
ASSISTANT_CONTEXT_PREFIX = "__APP_AI_CONTEXT__:"


def _normalize_locale(locale: str | None) -> str:
    if not locale:
        return "en"
    normalized = locale.strip().lower()
    for supported in ("en", "ru", "fr", "es"):
        if normalized.startswith(supported):
            return supported
    return "en"


def _locale_language(locale: str | None) -> str:
    return {
        "en": "English",
        "ru": "Russian",
        "fr": "French",
        "es": "Spanish",
    }[_normalize_locale(locale)]


def _localized_next_step(locale: str | None) -> str:
    return {
        "en": "Refine or finish",
        "ru": "Уточните или завершите",
        "fr": "Affiner ou terminer",
        "es": "Ajustar o finalizar",
    }[_normalize_locale(locale)]


def _format_lines(items: list[str], prefix: str = "- ") -> str:
    return "\n".join(f"{prefix}{item}" for item in items if item)


class BotSessionService:
    def __init__(self, settings: Settings, db: Session) -> None:
        self.settings = settings
        self.db = db
        self.openai = OpenAIBotClient(settings)

    @staticmethod
    def _fallback_telegram_user_id(*, owner_kind: str, owner_id: str) -> str:
        if owner_kind == "telegram":
            return owner_id
        return f"app:{owner_id}"

    def _resolve_owner(self, session: BotSession) -> tuple[str, str]:
        owner_kind = (session.owner_kind or "").strip() or "telegram"
        owner_id = (session.owner_id or "").strip() or session.telegram_user_id
        if not owner_id:
            raise HTTPException(status_code=500, detail="Session owner is missing")
        if session.owner_kind != owner_kind or session.owner_id != owner_id:
            session.owner_kind = owner_kind
            session.owner_id = owner_id
            self.db.flush()
        return owner_kind, owner_id

    def _close_active_sessions(self, *, owner_kind: str, owner_id: str) -> None:
        owner_match = and_(BotSession.owner_kind == owner_kind, BotSession.owner_id == owner_id)
        if owner_kind == "telegram":
            owner_match = or_(owner_match, and_(BotSession.owner_kind.is_(None), BotSession.telegram_user_id == owner_id))
        active_sessions = self.db.scalars(
            select(BotSession)
            .where(owner_match, BotSession.status == "active")
            .order_by(desc(BotSession.updated_at))
        ).all()
        for item in active_sessions:
            item.status = "closed"
            item.state = "closed"
            item.closed_at = utcnow()

    def _start_session(self, *, owner_kind: str, owner_id: str, mode: str) -> BotSession:
        session = BotSession(
            telegram_user_id=self._fallback_telegram_user_id(owner_kind=owner_kind, owner_id=owner_id),
            owner_kind=owner_kind,
            owner_id=owner_id,
            mode=mode,
            state="collecting_context",
            status="active",
            current_batch_no=1,
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def start_session(self, *, telegram_user_id: str, mode: str) -> BotSession:
        return self._start_session(owner_kind="telegram", owner_id=telegram_user_id, mode=mode)

    def start_app_session(self, *, app_user_id: str, mode: str) -> BotSession:
        return self._start_session(owner_kind="app", owner_id=app_user_id, mode=mode)

    def _get_session_for_owner(self, session_id: str, *, owner_kind: str, owner_id: str, active_only: bool = True) -> BotSession:
        session = self.db.scalar(select(BotSession).where(BotSession.id == session_id))
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")
        session_owner_kind, session_owner_id = self._resolve_owner(session)
        if session_owner_kind != owner_kind or session_owner_id != owner_id:
            raise HTTPException(status_code=403, detail="Session ownership mismatch")
        if active_only and session.status != "active":
            raise HTTPException(status_code=400, detail="Session is closed")
        return session

    def _get_session_for_user(self, session_id: str, telegram_user_id: str) -> BotSession:
        return self._get_session_for_owner(session_id, owner_kind="telegram", owner_id=telegram_user_id)

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

    def _append_asset_for_owner(
        self,
        *,
        session_id: str,
        owner_kind: str,
        owner_id: str,
        payload: BotSessionAssetRequest,
    ) -> BotContextAsset:
        session = self._get_session_for_owner(session_id, owner_kind=owner_kind, owner_id=owner_id)
        if session.state not in {"collecting_context", "awaiting_context_confirmation", "awaiting_refinement"}:
            raise HTTPException(status_code=400, detail="Session is not collecting context")
        if session.state == "awaiting_refinement":
            session.current_batch_no += 1
            session.state = "collecting_context"

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

    def append_asset(self, *, session_id: str, payload: BotSessionAssetRequest) -> BotContextAsset:
        return self._append_asset_for_owner(
            session_id=session_id,
            owner_kind="telegram",
            owner_id=payload.telegram_user_id,
            payload=payload,
        )

    def append_app_text_asset(
        self,
        *,
        session_id: str,
        app_user_id: str,
        text: str,
        role: str | None,
        display_name: str | None,
        sent_at: str | None,
    ) -> BotContextAsset:
        clean_text = text.strip()
        if clean_text.startswith(ASSISTANT_CONTEXT_PREFIX):
            session = self._get_session_for_owner(session_id, owner_kind="app", owner_id=app_user_id)
            if session.state not in {"collecting_context", "awaiting_context_confirmation", "awaiting_refinement"}:
                raise HTTPException(status_code=400, detail="Session is not collecting context")
            if session.state == "awaiting_refinement":
                session.current_batch_no += 1
                session.state = "collecting_context"

            assistant_text = clean_text.removeprefix(ASSISTANT_CONTEXT_PREFIX).strip()
            asset = BotContextAsset(
                session_id=session.id,
                batch_no=session.current_batch_no,
                asset_type="text",
                source_kind="assistant_context",
                extracted_text=assistant_text,
                parse_confidence=1.0,
                needs_confirmation=False,
                role_ambiguity=False,
                summary_for_user=f"[assistant_context] Предыдущий ответ ИИ: {assistant_text}".strip(),
                extraction_meta={"hidden": True, "source": "assistant_context"},
            )
            self.db.add(asset)
            self.db.commit()
            self.db.refresh(asset)
            return asset

        payload = BotSessionAssetRequest(
            telegram_user_id=self._fallback_telegram_user_id(owner_kind="app", owner_id=app_user_id),
            asset_type="text",
            payload=BotAssetPayload(text=clean_text, role=role, display_name=display_name, sent_at=sent_at),
            telegram_message_id=None,
        )
        return self._append_asset_for_owner(
            session_id=session_id,
            owner_kind="app",
            owner_id=app_user_id,
            payload=payload,
        )

    async def append_app_media_asset(
        self,
        *,
        session_id: str,
        app_user_id: str,
        asset_type: str,
        mime_type: str,
        content_base64: str,
        file_name: str | None,
        role: str | None,
        display_name: str | None,
        sent_at: str | None,
    ) -> BotContextAsset:
        payload = BotSessionAssetRequest(
            telegram_user_id=self._fallback_telegram_user_id(owner_kind="app", owner_id=app_user_id),
            asset_type=asset_type,
            payload=BotAssetPayload(
                media={
                    "mime_type": mime_type,
                    "content_base64": content_base64,
                    "file_name": file_name,
                },
                role=role,
                display_name=display_name,
                sent_at=sent_at,
            ),
            telegram_message_id=None,
        )
        return self._append_asset_for_owner(
            session_id=session_id,
            owner_kind="app",
            owner_id=app_user_id,
            payload=payload,
        )

    def delete_app_asset(self, *, session_id: str, asset_id: str, app_user_id: str) -> dict[str, Any]:
        session = self._get_session_for_owner(session_id, owner_kind="app", owner_id=app_user_id)
        if session.state not in {"collecting_context", "awaiting_context_confirmation", "ready_to_generate", "awaiting_refinement"}:
            raise HTTPException(status_code=400, detail="Session stage does not allow deleting context")

        asset = self.db.scalar(select(BotContextAsset).where(BotContextAsset.id == asset_id, BotContextAsset.session_id == session.id))
        if asset is None:
            raise HTTPException(status_code=404, detail="Asset not found")

        self.db.delete(asset)
        session.state = "collecting_context"
        session.updated_at = utcnow()
        self.db.commit()

        remaining_items = len(self._list_assets(session.id))
        try:
            context_preview = self._build_context_text(session.id) if remaining_items else ""
        except HTTPException:
            context_preview = ""

        return {
            "session_id": session.id,
            "asset_id": asset_id,
            "message_id": asset_id,
            "deleted": True,
            "remaining_items": remaining_items,
            "state": session.state,
            "context_preview": context_preview,
            "ui_payload": self._latest_generation_run(session.id).response_payload if self._latest_generation_run(session.id) else None,
        }

    def delete_app_message(self, *, session_id: str, message_id: str, app_user_id: str) -> dict[str, Any]:
        session = self._get_session_for_owner(session_id, owner_kind="app", owner_id=app_user_id)
        if session.state not in {"collecting_context", "awaiting_context_confirmation", "ready_to_generate", "awaiting_refinement"}:
            raise HTTPException(status_code=400, detail="Session stage does not allow deleting messages")

        asset = self.db.scalar(select(BotContextAsset).where(BotContextAsset.id == message_id, BotContextAsset.session_id == session.id))
        if asset is not None:
            return self.delete_app_asset(session_id=session_id, asset_id=message_id, app_user_id=app_user_id)

        run = self.db.scalar(select(BotGenerationRun).where(BotGenerationRun.id == message_id, BotGenerationRun.session_id == session.id))
        if run is None:
            raise HTTPException(status_code=404, detail="Message not found")

        self.db.delete(run)
        session.updated_at = utcnow()
        self.db.flush()

        remaining_items = len(self._list_assets(session.id))
        latest_run = self._latest_generation_run(session.id)
        if latest_run is not None:
            session.state = "awaiting_refinement"
        elif remaining_items:
            session.state = "ready_to_generate"
        else:
            session.state = "collecting_context"

        self.db.commit()

        try:
            context_preview = self._build_app_context_history_text(session.id) if remaining_items or latest_run else ""
        except HTTPException:
            context_preview = ""

        return {
            "session_id": session.id,
            "asset_id": message_id,
            "message_id": message_id,
            "deleted": True,
            "remaining_items": remaining_items,
            "state": session.state,
            "context_preview": context_preview,
            "ui_payload": latest_run.response_payload if latest_run else None,
        }

    def _close_batch_for_owner(self, *, session_id: str, owner_kind: str, owner_id: str) -> BotSessionBatchCloseResponse:
        session = self._get_session_for_owner(session_id, owner_kind=owner_kind, owner_id=owner_id)
        assets = self.db.scalars(
            select(BotContextAsset)
            .where(BotContextAsset.session_id == session.id, BotContextAsset.batch_no == session.current_batch_no)
            .order_by(BotContextAsset.created_at)
        ).all()
        if not assets:
            raise HTTPException(status_code=400, detail="No context provided for current batch")

        needs_confirmation = True
        session.state = "awaiting_context_confirmation"
        full_summary = self._build_context_text(session.id)
        context_preview = full_summary
        self.db.commit()

        return BotSessionBatchCloseResponse(
            session_id=session.id,
            state=session.state,
            needs_confirmation=needs_confirmation,
            context_preview=context_preview,
        )

    def close_batch(self, *, session_id: str, telegram_user_id: str) -> BotSessionBatchCloseResponse:
        return self._close_batch_for_owner(session_id=session_id, owner_kind="telegram", owner_id=telegram_user_id)

    def close_app_batch(self, *, session_id: str, app_user_id: str) -> BotSessionBatchCloseResponse:
        return self._close_batch_for_owner(session_id=session_id, owner_kind="app", owner_id=app_user_id)

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

    def confirm_app_context(
        self,
        *,
        session_id: str,
        app_user_id: str,
        action: str,
        edit_text: str | None,
    ) -> tuple[str, bool]:
        session = self._get_session_for_owner(session_id, owner_kind="app", owner_id=app_user_id)

        if action == "confirm:yes":
            session.state = "ready_to_generate"
            self.db.commit()
            return session.state, True

        if action == "confirm:edit":
            clean_edit_text = (edit_text or "").strip()
            if not clean_edit_text:
                raise HTTPException(status_code=400, detail="edit_text is required for confirm:edit")
            session.current_batch_no += 1
            session.state = "collecting_context"
            asset = BotContextAsset(
                session_id=session.id,
                batch_no=session.current_batch_no,
                asset_type="text",
                source_kind="user_edit",
                extracted_text=f"Уточнение пользователя: {clean_edit_text}",
                parse_confidence=1.0,
                needs_confirmation=False,
                role_ambiguity=False,
                summary_for_user=f"[text][edit] {clean_edit_text}",
                extraction_meta={"source": "confirm_edit"},
            )
            self.db.add(asset)
            self.db.commit()
            return session.state, False

        raise HTTPException(status_code=400, detail="Unsupported confirm action")

    def _build_asset_context_text(self, session_id: str) -> str:
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

    def _build_context_text(self, session_id: str) -> str:
        return self._build_asset_context_text(session_id)

    def _generation_context_text(self, run: BotGenerationRun, mode: str) -> str:
        payload = run.response_payload if isinstance(run.response_payload, dict) else {}
        rendered = self.render_ui_text(payload, mode).strip()
        label = "Уточненный ответ ИИ" if run.kind == "refine" else "Ответ ИИ"
        return f"[assistant][{run.kind}] {label}:\n{rendered}".strip()

    def _app_asset_transcript_text(self, asset: BotContextAsset) -> str:
        if asset.source_kind == "assistant_context":
            return ""

        if asset.asset_type == "image":
            source = "image_ocr"
        elif asset.asset_type == "audio":
            source = "audio_transcript"
        else:
            source = "text"

        meta = asset.extraction_meta if isinstance(asset.extraction_meta, dict) else {}
        metadata_parts = []
        role = str(meta.get("role") or "").strip()
        display_name = str(meta.get("display_name") or "").strip()
        sent_at = str(meta.get("sent_at") or "").strip()
        if role:
            metadata_parts.append(f"role={role}")
        if display_name:
            metadata_parts.append(f"display_name={display_name}")
        if sent_at:
            metadata_parts.append(f"sent_at={sent_at}")

        body = self._strip_service_tags((asset.summary_for_user or asset.extracted_text or "").strip())
        if not body:
            return ""
        metadata_line = f"\nmetadata: {', '.join(metadata_parts)}" if metadata_parts else ""
        return f"[user][{source}]{metadata_line}\ncontent:\n{body}".strip()

    @staticmethod
    def _format_app_list(items: Any) -> str:
        if not isinstance(items, list):
            return "- нет"
        lines = [f"- {str(item).strip()}" for item in items if str(item).strip()]
        return "\n".join(lines) if lines else "- нет"

    def _app_assistant_transcript_text(self, run: BotGenerationRun) -> str:
        payload = run.response_payload if isinstance(run.response_payload, dict) else {}
        if not payload:
            return ""
        return (
            f"[assistant][analysis][{run.kind}]\n"
            f"diagnosis:\n{str(payload.get('diagnosis') or '').strip()}\n\n"
            f"core_leverage:\n{str(payload.get('core_leverage') or '').strip()}\n\n"
            f"plan_24h:\n{self._format_app_list(payload.get('plan_24h'))}\n\n"
            f"plan_if_reply:\n{self._format_app_list(payload.get('plan_if_reply'))}\n\n"
            f"plan_if_no_reply:\n{self._format_app_list(payload.get('plan_if_no_reply'))}\n\n"
            f"message_template:\n{str(payload.get('message_template') or '').strip()}\n\n"
            f"avoid_list:\n{self._format_app_list(payload.get('avoid_list'))}"
        ).strip()

    def _build_app_context_history_text(self, session_id: str) -> str:
        assets = self._list_assets(session_id)
        runs = self.db.scalars(
            select(BotGenerationRun)
            .where(BotGenerationRun.session_id == session_id)
            .order_by(BotGenerationRun.created_at)
        ).all()

        chunks: list[tuple[datetime, str]] = []
        for asset in assets:
            text = self._app_asset_transcript_text(asset)
            if text:
                chunks.append((asset.created_at, text))

        for run in runs:
            text = self._app_assistant_transcript_text(run)
            if text:
                chunks.append((run.created_at, text))

        chunks.sort(key=lambda item: item[0])
        if not chunks:
            raise HTTPException(status_code=400, detail="Session context is empty")
        return "\n\n".join(text for _, text in chunks)

    def _generate_prompt_app_analyze_case(self, request: BotSessionGenerateRequest, transcript: str, locale: str | None = "ru") -> str:
        normalized_locale = _normalize_locale(locale)
        language = _locale_language(normalized_locale)
        empty_constraints = {"en": "none", "ru": "нет", "fr": "aucune", "es": "ninguna"}
        empty_tried_actions = {"en": "nothing", "ru": "ничего", "fr": "rien", "es": "nada"}
        default_target = {
            "en": "reduce tension and restart the conversation",
            "ru": "снизить напряжение и вернуть диалог",
            "fr": "réduire la tension et relancer la conversation",
            "es": "reducir la tensión y reactivar la conversación",
        }
        constraints = ", ".join(request.constraints) if request.constraints else empty_constraints[normalized_locale]
        tried_actions = ", ".join(request.tried_actions) if request.tried_actions else empty_tried_actions[normalized_locale]
        target = request.target_outcome or default_target[normalized_locale]
        if normalized_locale != "ru":
            return (
                "Create JSON for AnalyzeCaseResponseSchema.\n"
                "Domain: dating, conversation, attraction, and respectful communication with a woman.\n"
                f"Goal: {target}\n"
                f"What has already been tried: {tried_actions}\n"
                f"Constraints: {constraints}\n"
                "Chronological consultation history:\n"
                f"{transcript}\n"
                "How to read the history:\n"
                "- [user] blocks are facts, context, chat excerpts, OCR, and audio transcripts from the user.\n"
                "- [assistant] blocks are previous system advice, not facts from the chat and not the woman's words.\n"
                "- Latest [user] blocks override earlier [assistant] conclusions when they conflict.\n"
                "Requirements:\n"
                "- Return JSON only, no markdown.\n"
                "- Allowed keys only: diagnosis, core_leverage, plan_24h, plan_if_reply, plan_if_no_reply, message_template, avoid_list.\n"
                "- No extra keys and no wrapper objects.\n"
                "- Keep continuity with prior [assistant] answers, but do not copy them verbatim.\n"
                "- If a new [user] fact changes the situation, update diagnosis, core_leverage, plan, and message_template.\n"
                "- message_template must be the next best message for the current moment.\n"
                "- plan_24h, plan_if_reply, plan_if_no_reply: at least 1 item each.\n"
                "- avoid_list: at least 3 items.\n"
                "- All plan_* and avoid_list items must be strings.\n"
                "- Each plan_* item must be one concrete imperative action and start with a verb, for example: 'Send...', 'Ask...', 'Suggest...'.\n"
                "- Do not start plan_* items with 'If...', 'When...', or 'In case...'. Put conditions after the verb when needed.\n"
                "- Each plan_* item must be at least 6 words and include specifics: what to do plus why or when.\n"
                f"- Write all user-visible values in natural {language}.\n"
                "- Use concrete actions, no accusations, no pressure, no manipulation."
            )
        return (
            "Сформируй JSON для схемы AnalyzeCaseResponseSchema.\n"
            "Домен: знакомство/общение/соблазнение с девушкой.\n"
            f"Цель: {target}\n"
            f"Что уже пробовали: {tried_actions}\n"
            f"Ограничения: {constraints}\n"
            "Хронологическая история консультации:\n"
            f"{transcript}\n"
            "Как читать историю:\n"
            "- Блоки [user] — факты, вводные, переписка, OCR и аудио-транскрипты пользователя.\n"
            "- Блоки [assistant] — прошлые советы системы, а не факты переписки и не слова собеседника.\n"
            "- Последние блоки [user] имеют приоритет над предыдущими выводами [assistant].\n"
            "Требования:\n"
            "- Ответ только JSON, без markdown.\n"
            "- Разрешены только ключи: diagnosis, core_leverage, plan_24h, plan_if_reply, plan_if_no_reply, message_template, avoid_list.\n"
            "- Запрещены любые лишние ключи и вложенные обертки.\n"
            "- Сохраняй преемственность с прошлыми [assistant]-ответами, но не повторяй их дословно.\n"
            "- Если новый [user]-факт меняет ситуацию, обнови diagnosis, core_leverage, план и message_template.\n"
            "- message_template должен быть следующим лучшим сообщением для текущего момента.\n"
            "- plan_24h, plan_if_reply, plan_if_no_reply: минимум по 1 пункту.\n"
            "- avoid_list: минимум 3 пункта.\n"
            "- Все элементы plan_* и avoid_list должны быть строками.\n"
            "- Каждый элемент plan_* должен быть одним конкретным действием в повелительной форме и начинаться с глагола (например: «Отправь...», «Уточни...», «Предложи...»).\n"
            "- Не начинай элементы plan_* с вводных конструкций «Если...», «Когда...», «В случае...». Условия можно писать после глагола.\n"
            "- Каждый элемент plan_* должен быть не короче 6 слов и содержать конкретику (что сделать + с какой целью/в какие сроки).\n"
            "- Пиши конкретные действия, без обвинений, без давления, без манипуляций."
        )

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

    def _generate_for_owner(self, *, session_id: str, owner_kind: str, owner_id: str, payload: BotSessionGenerateRequest) -> dict[str, Any]:
        session = self._get_session_for_owner(session_id, owner_kind=owner_kind, owner_id=owner_id)
        if session.state not in {"ready_to_generate", "awaiting_refinement"}:
            raise HTTPException(status_code=400, detail="Session is not ready to generate")

        if owner_kind == "app":
            context = self._build_app_context_history_text(session_id)
        else:
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

    def generate(self, *, session_id: str, payload: BotSessionGenerateRequest) -> dict[str, Any]:
        return self._generate_for_owner(
            session_id=session_id,
            owner_kind="telegram",
            owner_id=payload.telegram_user_id,
            payload=payload,
        )

    def generate_app(
        self,
        *,
        session_id: str,
        app_user_id: str,
        scenario: str,
        tone: str | None,
        constraints: list[str],
        tried_actions: list[str],
        target_outcome: str | None,
        locale: str | None = None,
    ) -> dict[str, Any]:
        session = self._get_session_for_owner(session_id, owner_kind="app", owner_id=app_user_id)
        if session.state not in {"ready_to_generate", "awaiting_refinement"}:
            raise HTTPException(status_code=400, detail="Session is not ready to generate")
        if session.mode != "analyze_case":
            session.mode = "analyze_case"

        payload = BotSessionGenerateRequest(
            telegram_user_id=self._fallback_telegram_user_id(owner_kind="app", owner_id=app_user_id),
            scenario=scenario,
            tone=tone,
            constraints=constraints,
            tried_actions=tried_actions,
            target_outcome=target_outcome,
        )
        context = self._build_app_context_history_text(session_id)
        prompt = self._generate_prompt_app_analyze_case(payload, context, locale)
        raw = self.openai.generate_analyze_case(prompt)
        try:
            ui_payload = BotUiPayloadAnalyzeCase(**raw).model_dump()
        except ValidationError as exc:
            raise HTTPException(status_code=502, detail=f"OpenAI analyze_case schema mismatch: {exc}") from exc

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

    def _refine_for_owner(
        self,
        *,
        session_id: str,
        owner_kind: str,
        owner_id: str,
        payload: BotSessionRefineRequest,
        locale: str | None = "ru",
    ) -> dict[str, Any]:
        session = self._get_session_for_owner(session_id, owner_kind=owner_kind, owner_id=owner_id)
        if session.state != "awaiting_refinement":
            raise HTTPException(status_code=400, detail="Session is not awaiting refinement")

        latest_generate = self.db.scalar(
            select(BotGenerationRun)
            .where(BotGenerationRun.session_id == session.id)
            .order_by(desc(BotGenerationRun.created_at))
        )
        if latest_generate is None:
            raise HTTPException(status_code=400, detail="No generation result to refine")

        response_payload = latest_generate.response_payload or {}
        if session.mode == "write_now":
            result = self._refine_write_now(response_payload=response_payload, command=payload.command, locale=locale)
        elif session.mode == "analyze_case":
            result = self._refine_analyze_case(response_payload=response_payload, command=payload.command, locale=locale)
        else:
            raise HTTPException(status_code=400, detail="Unsupported session mode")

        run = BotGenerationRun(
            session_id=session.id,
            kind="refine",
            request_payload=payload.model_dump(),
            response_payload=result["ui_payload"],
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
            "ui_payload": result["ui_payload"],
            "primary_message": result.get("primary_message"),
            "why": result.get("why"),
            "fallback_simple_version": result.get("fallback_simple_version"),
            "next_step": "refine_or_finish",
            "alternatives": result.get("alternatives", []),
        }

    def _refine_write_now(self, *, response_payload: Any, command: str, locale: str | None = "ru") -> dict[str, Any]:
        base_text = ""
        if isinstance(response_payload, dict):
            base_text = str(response_payload.get("primary_message") or response_payload.get("message_template") or "")

        normalized_locale = _normalize_locale(locale)
        if normalized_locale != "ru":
            language = _locale_language(normalized_locale)
            refine_prompt = (
                "Return only a JSON object without markdown with keys:\n"
                "- primary_message (str)\n"
                "- why (str)\n"
                "- fallback_simple_version (str)\n"
                "- alternatives (array of str, can be empty)\n"
                f"Original message: {base_text}\n"
                f"User refinement: {command}\n"
                "Requirements:\n"
                "- Preserve the intent of the original message.\n"
                "- Apply every user refinement.\n"
                "- primary_message <= 420 characters.\n"
                f"- Write all user-visible values in natural {language}."
            )
        else:
            refine_prompt = (
                "Верни только JSON-объект без markdown с ключами:\n"
                "- primary_message (str)\n"
                "- why (str)\n"
                "- fallback_simple_version (str)\n"
                "- alternatives (array of str, можно пустой)\n"
                f"Исходное сообщение: {base_text}\n"
                f"Уточнения пользователя: {command}\n"
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
            "next_step": _localized_next_step(locale),
            "fallback_simple_version": fallback_simple_version,
            "alternatives": [str(item) for item in alternatives],
        }
        return {
            "ui_payload": ui_payload,
            "primary_message": primary_message,
            "why": why,
            "fallback_simple_version": fallback_simple_version,
            "alternatives": [str(item) for item in alternatives],
        }

    def _refine_analyze_case(self, *, response_payload: Any, command: str, locale: str | None = "ru") -> dict[str, Any]:
        if not isinstance(response_payload, dict):
            raise HTTPException(status_code=502, detail="Previous analyze_case payload is invalid")

        normalized_locale = _normalize_locale(locale)
        if normalized_locale != "ru":
            language = _locale_language(normalized_locale)
            refine_prompt = (
                "Return only a JSON object without markdown with keys:\n"
                "- diagnosis (str)\n"
                "- core_leverage (str)\n"
                "- plan_24h (array of str)\n"
                "- plan_if_reply (array of str)\n"
                "- plan_if_no_reply (array of str)\n"
                "- message_template (str)\n"
                "- avoid_list (array of str)\n"
                "Current analysis:\n"
                f"- diagnosis: {response_payload.get('diagnosis', '')}\n"
                f"- core_leverage: {response_payload.get('core_leverage', '')}\n"
                f"- plan_24h: {response_payload.get('plan_24h', [])}\n"
                f"- plan_if_reply: {response_payload.get('plan_if_reply', [])}\n"
                f"- plan_if_no_reply: {response_payload.get('plan_if_no_reply', [])}\n"
                f"- message_template: {response_payload.get('message_template', '')}\n"
                f"- avoid_list: {response_payload.get('avoid_list', [])}\n"
                f"User refinement: {command}\n"
                "Requirements:\n"
                "- Preserve the situation-analysis structure.\n"
                "- Apply every user refinement.\n"
                "- plan_24h, plan_if_reply, plan_if_no_reply: at least 1 item each.\n"
                "- avoid_list: at least 3 items.\n"
                "- All list items must be strings.\n"
                f"- Write all user-visible values in natural {language}."
            )
        else:
            refine_prompt = (
                "Верни только JSON-объект без markdown с ключами:\n"
                "- diagnosis (str)\n"
                "- core_leverage (str)\n"
                "- plan_24h (array of str)\n"
                "- plan_if_reply (array of str)\n"
                "- plan_if_no_reply (array of str)\n"
                "- message_template (str)\n"
                "- avoid_list (array of str)\n"
                "Текущий разбор:\n"
                f"- diagnosis: {response_payload.get('diagnosis', '')}\n"
                f"- core_leverage: {response_payload.get('core_leverage', '')}\n"
                f"- plan_24h: {response_payload.get('plan_24h', [])}\n"
                f"- plan_if_reply: {response_payload.get('plan_if_reply', [])}\n"
                f"- plan_if_no_reply: {response_payload.get('plan_if_no_reply', [])}\n"
                f"- message_template: {response_payload.get('message_template', '')}\n"
                f"- avoid_list: {response_payload.get('avoid_list', [])}\n"
                f"Уточнения пользователя: {command}\n"
                "Требования:\n"
                "- Сохрани структуру разбор-ситуации.\n"
                "- Учти все уточнения пользователя.\n"
                "- plan_24h, plan_if_reply, plan_if_no_reply: минимум по 1 пункту.\n"
                "- avoid_list: минимум 3 пункта.\n"
                "- Все элементы списков должны быть строками.\n"
                "- Ответ на русском."
            )
        raw = self.openai.refine_analyze_case(refine_prompt)
        try:
            ui_payload = BotUiPayloadAnalyzeCase(**raw).model_dump()
        except ValidationError as exc:
            raise HTTPException(status_code=502, detail=f"OpenAI analyze_case refine schema mismatch: {exc}") from exc

        return {
            "ui_payload": ui_payload,
            "alternatives": [],
        }

    def refine(self, *, session_id: str, payload: BotSessionRefineRequest) -> dict[str, Any]:
        return self._refine_for_owner(
            session_id=session_id,
            owner_kind="telegram",
            owner_id=payload.telegram_user_id,
            payload=payload,
        )

    def refine_app(self, *, session_id: str, app_user_id: str, command: str, locale: str | None = None) -> dict[str, Any]:
        payload = BotSessionRefineRequest(
            telegram_user_id=self._fallback_telegram_user_id(owner_kind="app", owner_id=app_user_id),
            command=command,
        )
        return self._refine_for_owner(
            session_id=session_id,
            owner_kind="app",
            owner_id=app_user_id,
            payload=payload,
            locale=locale,
        )

    def reset(self, *, session_id: str, telegram_user_id: str) -> BotSession:
        session = self._get_session_for_user(session_id, telegram_user_id)
        session.status = "closed"
        session.state = "closed"
        session.closed_at = utcnow()
        self.db.commit()
        return session

    def reset_app(self, *, session_id: str, app_user_id: str) -> BotSession:
        session = self._get_session_for_owner(session_id, owner_kind="app", owner_id=app_user_id)
        session.status = "closed"
        session.state = "closed"
        session.closed_at = utcnow()
        self.db.commit()
        return session

    def reset_active(self, *, telegram_user_id: str) -> int:
        active_sessions = self.db.scalars(
            select(BotSession)
            .where(
                or_(
                    and_(BotSession.owner_kind == "telegram", BotSession.owner_id == telegram_user_id),
                    and_(BotSession.owner_kind.is_(None), BotSession.telegram_user_id == telegram_user_id),
                ),
                BotSession.status == "active",
            )
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

    def reset_active_app(self, *, app_user_id: str) -> int:
        active_sessions = self.db.scalars(
            select(BotSession)
            .where(BotSession.owner_kind == "app", BotSession.owner_id == app_user_id, BotSession.status == "active")
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

    @staticmethod
    def _session_preview_from_payload(payload: dict[str, Any] | None) -> str:
        if not isinstance(payload, dict):
            return ""
        for key in ("primary_message", "diagnosis", "message_template", "next_step"):
            value = str(payload.get(key) or "").strip()
            if value:
                return value[:180]
        return ""

    @staticmethod
    def _strip_service_tags(value: str) -> str:
        return re.sub(r"\[[^\]]+\]\s*", "", value).strip()

    def _assistant_message_text(self, payload: dict[str, Any] | None) -> str:
        if not isinstance(payload, dict):
            return ""
        for key in ("message_template", "diagnosis", "primary_message", "next_step"):
            value = str(payload.get(key) or "").strip()
            if value:
                return value
        return self.render_ui_text(payload, "analyze_case").strip()

    def _asset_message_text(self, asset: BotContextAsset) -> str:
        body = self._strip_service_tags((asset.summary_for_user or asset.extracted_text or "").strip())
        if asset.asset_type == "audio":
            return f"[ГОЛОСОВОЕ]: {body}".strip() if body else "[ГОЛОСОВОЕ]"
        if asset.asset_type == "image":
            return f"[ИЗОБРАЖЕНИЕ]: {body}".strip() if body else "[ИЗОБРАЖЕНИЕ]"
        return body

    def _asset_role(self, asset: BotContextAsset) -> str | None:
        meta = asset.extraction_meta if isinstance(asset.extraction_meta, dict) else {}
        role = str(meta.get("role") or "").strip()
        if role in {"USER_SELF", "USER_PEER"}:
            return role
        if asset.asset_type in {"text", "image", "audio", "forward"}:
            return "USER_SELF"
        return None

    def _asset_author_label(self, asset: BotContextAsset) -> str | None:
        meta = asset.extraction_meta if isinstance(asset.extraction_meta, dict) else {}
        display_name = str(meta.get("display_name") or "").strip()
        if display_name:
            return display_name
        role = self._asset_role(asset)
        if role == "USER_PEER":
            return "Собеседник"
        if role == "USER_SELF":
            return "Я писал(а)"
        return None

    def _asset_sent_at(self, asset: BotContextAsset) -> str | None:
        meta = asset.extraction_meta if isinstance(asset.extraction_meta, dict) else {}
        sent_at = str(meta.get("sent_at") or "").strip()
        if sent_at:
            return sent_at
        return None

    def _list_assets(self, session_id: str) -> list[BotContextAsset]:
        assets = self.db.scalars(
            select(BotContextAsset).where(BotContextAsset.session_id == session_id).order_by(BotContextAsset.created_at)
        ).all()

        def _sort_key(item: BotContextAsset) -> tuple[datetime, datetime]:
            raw_sent_at = None
            if isinstance(item.extraction_meta, dict):
                raw_sent_at = item.extraction_meta.get("sent_at")
            parsed_sent_at = self._safe_parse_iso_datetime(str(raw_sent_at)) if raw_sent_at else None
            if parsed_sent_at is not None:
                return parsed_sent_at, item.created_at
            return item.created_at, item.created_at

        return sorted(assets, key=_sort_key)

    def _list_session_messages(self, session_id: str) -> list[dict[str, Any]]:
        messages: list[tuple[datetime, dict[str, Any]]] = []
        for asset in self._list_assets(session_id):
            if asset.source_kind == "assistant_context":
                continue
            text = self._asset_message_text(asset)
            if not text:
                continue
            messages.append(
                (
                    asset.created_at,
                    {
                        "id": asset.id,
                        "kind": "image" if asset.asset_type == "image" else "audio" if asset.asset_type == "audio" else "text",
                        "role": self._asset_role(asset),
                        "author_label": self._asset_author_label(asset),
                        "sent_at": self._asset_sent_at(asset),
                        "text": text,
                        "ui_payload": None,
                    },
                )
            )
        session = self.db.scalar(select(BotSession).where(BotSession.id == session_id))
        mode = session.mode if session is not None else "analyze_case"
        runs = self.db.scalars(
            select(BotGenerationRun)
            .where(BotGenerationRun.session_id == session_id)
            .order_by(BotGenerationRun.created_at)
        ).all()
        for run in runs:
            payload = run.response_payload if isinstance(run.response_payload, dict) else {}
            text = self._assistant_message_text(payload)
            if not text:
                text = self.render_ui_text(payload, mode).strip()
            if not text:
                continue
            messages.append(
                (
                    run.created_at,
                    {
                        "id": run.id,
                        "kind": "assistant",
                        "role": None,
                        "author_label": "Flirto Guru",
                        "sent_at": run.created_at.isoformat(),
                        "text": text,
                        "ui_payload": payload,
                    },
                )
            )
        messages.sort(key=lambda item: item[0])
        return [message for _, message in messages]

    def _latest_generation_run(self, session_id: str) -> BotGenerationRun | None:
        return self.db.scalar(
            select(BotGenerationRun)
            .where(BotGenerationRun.session_id == session_id)
            .order_by(desc(BotGenerationRun.created_at))
        )

    def list_app_sessions(self, *, app_user_id: str) -> list[dict[str, Any]]:
        sessions = self.db.scalars(
            select(BotSession)
            .where(BotSession.owner_kind == "app", BotSession.owner_id == app_user_id)
            .order_by(desc(BotSession.updated_at))
        ).all()
        items: list[dict[str, Any]] = []
        for session in sessions:
            latest_run = self._latest_generation_run(session.id)
            preview = self._session_preview_from_payload(latest_run.response_payload if latest_run else None)
            if not preview:
                messages = self._list_session_messages(session.id)
                preview = (messages[-1]["text"] if messages else "")[:180]
            items.append(
                {
                    "session_id": session.id,
                    "mode": session.mode,
                    "status": session.status,
                    "state": session.state,
                    "created_at": session.created_at.isoformat(),
                    "updated_at": session.updated_at.isoformat(),
                    "preview": preview,
                }
            )
        return items

    def get_app_session_detail(self, *, session_id: str, app_user_id: str) -> dict[str, Any]:
        session = self._get_session_for_owner(session_id, owner_kind="app", owner_id=app_user_id, active_only=False)
        latest_run = self._latest_generation_run(session.id)
        try:
            context_preview = self._build_app_context_history_text(session.id)
        except HTTPException:
            context_preview = ""
        return {
            "session_id": session.id,
            "mode": session.mode,
            "status": session.status,
            "state": session.state,
            "context_preview": context_preview,
            "messages": self._list_session_messages(session.id),
            "ui_payload": latest_run.response_payload if latest_run else None,
            "editable": session.status == "active",
            "created_at": session.created_at.isoformat(),
            "updated_at": session.updated_at.isoformat(),
        }
