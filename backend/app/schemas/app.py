from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class AppUserResponse(BaseModel):
    id: str
    email: str
    locale: str


class AppAccessStatusResponse(BaseModel):
    has_access: bool
    order_id: str | None = None
    plan: str | None = None
    access_status: str | None = None
    expires_at: str | None = None


class AppAuthTokens(BaseModel):
    access_token: str
    expires_in: int


class AppAuthResponse(BaseModel):
    user: AppUserResponse
    tokens: AppAuthTokens
    access: AppAccessStatusResponse


class AppEmailCodeRequest(BaseModel):
    email: str = Field(min_length=3)


class AppEmailCodeConfirmRequest(BaseModel):
    email: str = Field(min_length=3)
    code: str = Field(min_length=6, max_length=6)


class AppEmailCodeResponse(BaseModel):
    status: str


class AppSupportRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class AppSessionStartRequest(BaseModel):
    mode: Literal["analyze_case"]


class AppSessionStartResponse(BaseModel):
    session_id: str
    mode: Literal["write_now", "analyze_case"]
    state: str
    next_step: str


class AppSessionListItemResponse(BaseModel):
    session_id: str
    mode: Literal["write_now", "analyze_case"]
    status: str
    state: str
    created_at: str
    updated_at: str
    preview: str = ""


class AppSessionMessageResponse(BaseModel):
    id: str
    kind: Literal["text", "image", "audio", "system", "assistant"]
    role: str | None = None
    author_label: str | None = None
    sent_at: str | None = None
    text: str
    ui_payload: dict[str, Any] | None = None


class AppSessionDetailResponse(BaseModel):
    session_id: str
    mode: Literal["write_now", "analyze_case"]
    status: str
    state: str
    context_preview: str
    messages: list[AppSessionMessageResponse] = Field(default_factory=list)
    ui_payload: dict[str, Any] | None = None
    editable: bool
    created_at: str
    updated_at: str


class AppTextAssetRequest(BaseModel):
    text: str = Field(min_length=1)
    role: str | None = None
    display_name: str | None = None
    sent_at: str | None = None


class AppSessionAssetResponse(BaseModel):
    session_id: str
    asset_id: str
    state: str
    needs_confirmation: bool
    summary_for_user: str


class AppSessionBatchCloseResponse(BaseModel):
    session_id: str
    state: str
    needs_confirmation: bool
    context_preview: str


class AppSessionDeleteAssetResponse(BaseModel):
    session_id: str
    asset_id: str
    message_id: str | None = None
    deleted: bool
    remaining_items: int
    state: str
    context_preview: str
    ui_payload: dict[str, Any] | None = None


class AppSessionConfirmContextRequest(BaseModel):
    action: Literal["confirm:yes", "confirm:edit"]
    edit_text: str | None = None


class AppSessionGenerateRequest(BaseModel):
    scenario: str = "standard"
    tone: str | None = None
    constraints: list[str] = Field(default_factory=list)
    tried_actions: list[str] = Field(default_factory=list)
    target_outcome: str | None = None


class AppSessionGenerateResponse(BaseModel):
    session_id: str
    mode: str
    state: str
    next_step: str
    llm_provider: str
    model_name: str
    ui_payload: dict[str, Any]


class AppSessionRefineRequest(BaseModel):
    command: str = Field(min_length=1)


class AppSessionRefineResponse(BaseModel):
    session_id: str
    mode: str
    state: str
    llm_provider: str
    model_name: str
    ui_payload: dict[str, Any]
    primary_message: str | None = None
    why: str | None = None
    fallback_simple_version: str | None = None
    next_step: str
    alternatives: list[str] = Field(default_factory=list)


class AppSessionResetResponse(BaseModel):
    session_id: str
    status: str


class AppSessionResetActiveResponse(BaseModel):
    status: str
    closed_sessions: int
