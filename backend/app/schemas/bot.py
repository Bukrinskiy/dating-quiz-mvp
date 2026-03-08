from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


class BotAccessStatusRequest(BaseModel):
    telegram_user_id: str = Field(min_length=1)


class BotAccessStatusResponse(BaseModel):
    is_paid: bool
    order_id: str | None = None
    plan: str | None = None
    access_status: str | None = None


class BotActivateAccessRequest(BaseModel):
    activation_token: str = Field(min_length=1)
    telegram_user_id: str = Field(min_length=1)


class BotRestoreRequest(BaseModel):
    email: str


class BotRestoreConfirmRequest(BaseModel):
    email: str
    otp: str = Field(min_length=6, max_length=6)
    telegram_user_id: str = Field(min_length=1)


class BotSessionStartRequest(BaseModel):
    telegram_user_id: str = Field(min_length=1)
    mode: Literal["write_now", "analyze_case"]


class BotSessionStartResponse(BaseModel):
    session_id: str
    mode: Literal["write_now", "analyze_case"]
    state: str
    next_step: str


class BotMediaPayload(BaseModel):
    mime_type: str = Field(min_length=1)
    content_base64: str = Field(min_length=1)
    file_name: str | None = None
    duration_seconds: int | None = None


class BotAssetPayload(BaseModel):
    text: str | None = None
    caption: str | None = None
    duration_seconds: int | None = None
    media: BotMediaPayload | None = None
    role: str | None = None
    display_name: str | None = None
    sent_at: str | None = None


class BotSessionAssetRequest(BaseModel):
    telegram_user_id: str = Field(min_length=1)
    asset_type: Literal["text", "forward", "image", "audio"]
    payload: BotAssetPayload
    telegram_message_id: int | None = None

    @model_validator(mode="after")
    def validate_payload(self) -> "BotSessionAssetRequest":
        if self.asset_type in {"text", "forward"} and not (self.payload.text or "").strip():
            raise ValueError("payload.text is required for text/forward asset")
        if self.asset_type in {"image", "audio"}:
            if self.payload.media is None:
                raise ValueError("payload.media is required for image/audio asset")
        return self


class BotSessionAssetResponse(BaseModel):
    session_id: str
    asset_id: str
    state: str
    needs_confirmation: bool
    summary_for_user: str


class BotSessionBatchCloseRequest(BaseModel):
    telegram_user_id: str = Field(min_length=1)


class BotSessionBatchCloseResponse(BaseModel):
    session_id: str
    state: str
    needs_confirmation: bool
    context_preview: str


class BotSessionConfirmContextRequest(BaseModel):
    telegram_user_id: str = Field(min_length=1)
    action: Literal["confirm:yes", "confirm:edit"]
    edit_text: str | None = None


class BotSessionConfirmContextResponse(BaseModel):
    session_id: str
    state: str
    confirmed: bool


class BotGenerateOfflineFirstMessage(BaseModel):
    meet_place: str | None = None
    goal: str | None = None


class BotSessionGenerateRequest(BaseModel):
    telegram_user_id: str = Field(min_length=1)
    scenario: str = "standard"
    offline_first_message: BotGenerateOfflineFirstMessage | None = None
    tone: str | None = None
    constraints: list[str] = Field(default_factory=list)
    tried_actions: list[str] = Field(default_factory=list)
    target_outcome: str | None = None


class BotUiPayloadWriteNow(BaseModel):
    primary_message: str
    why: str
    risks: list[str]
    avoid_list: list[str]
    next_step: str
    fallback_simple_version: str
    alternatives: list[str]


class BotUiPayloadAnalyzeCase(BaseModel):
    diagnosis: str
    core_leverage: str
    plan_24h: list[str]
    plan_if_reply: list[str]
    plan_if_no_reply: list[str]
    message_template: str
    avoid_list: list[str]


class BotSessionGenerateResponse(BaseModel):
    session_id: str
    mode: str
    state: str
    next_step: str
    llm_provider: str
    model_name: str
    ui_payload: dict[str, Any]


class BotSessionRefineRequest(BaseModel):
    telegram_user_id: str = Field(min_length=1)
    command: str = Field(min_length=1)


class BotSessionRefineResponse(BaseModel):
    session_id: str
    mode: str
    state: str
    llm_provider: str
    model_name: str
    ui_payload: dict[str, Any]
    primary_message: str
    why: str
    fallback_simple_version: str
    next_step: str
    alternatives: list[str]


class BotSessionResetRequest(BaseModel):
    telegram_user_id: str = Field(min_length=1)


class BotSessionResetResponse(BaseModel):
    session_id: str
    status: str


class BotSessionResetActiveRequest(BaseModel):
    telegram_user_id: str = Field(min_length=1)


class BotSessionResetActiveResponse(BaseModel):
    status: str
    closed_sessions: int


class BotMediaTranscribeRequest(BaseModel):
    asset_type: Literal["audio", "image"]
    payload: BotAssetPayload

    @model_validator(mode="after")
    def validate_media(self) -> "BotMediaTranscribeRequest":
        if self.payload.media is None:
            raise ValueError("payload.media is required")
        return self


class BotMediaTranscribeResponse(BaseModel):
    text: str
