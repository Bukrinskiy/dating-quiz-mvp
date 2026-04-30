from __future__ import annotations

import base64
import json
import logging
import time
from pathlib import Path
from typing import Any

import httpx
from fastapi import HTTPException

from app.core.config import Settings

logger = logging.getLogger("quiz.bot_openai")

OCR_PROMPT = (
    "Analyze the entire image, not only visible text. Return plain text in Russian without shortening or omitting "
    "important details: 1) all visible text snippets, 2) key scene/context details, 3) probable speaker-role cues "
    "if present, 4) uncertainties if any."
)

WRITE_NOW_SYSTEM_PROMPT = (
    "Ты senior-эксперт по знакомствам, коммуникации и дейтинговым сценариям. "
    "Дай практичный, безопасный, реалистичный вариант сообщения для знакомства/продолжения общения. "
    "Фокус домена: знакомство, общение, соблазнение с девушкой. Пиши по-русски, кратко, "
    "уважительно, без манипуляций и без давления. Верни ровно один JSON-объект строго формата "
    "WriteNowResponseSchema."
)

ANALYZE_CASE_SYSTEM_PROMPT = (
    "Ты senior-эксперт по знакомствам и разбору межличностных ситуаций. Дай структурный и практичный "
    "план действий, который снижает напряжение и помогает вернуть диалог. Фокус домена: знакомство, "
    "общение, соблазнение с девушкой. Пиши по-русски, безопасно, уважительно, без манипуляций и без "
    "давления. Верни ровно один JSON-объект строго формата AnalyzeCaseResponseSchema."
)

REFINE_SYSTEM_PROMPT = (
    "Ты senior-эксперт по знакомствам и коммуникации. Тебе дано исходное сообщение и уточнения "
    "пользователя, что нужно поменять. Сформируй обновленную версию сообщения по уточнениям, "
    "без манипуляций и давления."
)

REFINE_ANALYZE_CASE_SYSTEM_PROMPT = (
    "Ты senior-эксперт по знакомствам и разбору межличностных ситуаций. Тебе дан текущий разбор "
    "ситуации и уточнения пользователя, что именно нужно поменять. Верни обновленный структурный "
    "разбор в том же формате, без манипуляций и давления."
)


class OpenAIBotClient:
    def __init__(self, settings: Settings) -> None:
        self._base = settings.openai_api_base.rstrip("/")
        self._key = settings.openai_api_key.strip()
        self._model_generate = settings.bot_openai_model_generate
        self._model_stt = settings.bot_openai_model_stt
        self._timeout = float(settings.bot_openai_timeout_seconds)
        self._retries = max(0, settings.bot_openai_retries)

    @staticmethod
    def _retry_delay_seconds(attempt: int) -> float:
        # Docker's embedded DNS can occasionally fail transiently; small backoff
        # improves recovery odds for outbound OpenAI requests.
        return min(1.5, 0.35 * attempt)

    @staticmethod
    def _normalize_audio_mime_type(mime_type: str) -> str:
        normalized = mime_type.split(";")[0].strip().lower()
        if normalized in {"audio/webm", "video/webm"}:
            return "audio/webm"
        if normalized in {"audio/wav", "audio/x-wav"}:
            return "audio/wav"
        if normalized in {"audio/mp4", "audio/m4a", "audio/x-m4a"}:
            return "audio/m4a"
        if normalized in {"audio/mpeg", "audio/mp3"}:
            return "audio/mpeg"
        return normalized or "audio/webm"

    @classmethod
    def _audio_extension_for_mime_type(cls, mime_type: str) -> str:
        normalized = cls._normalize_audio_mime_type(mime_type)
        if normalized == "audio/webm":
            return ".webm"
        if normalized == "audio/wav":
            return ".wav"
        if normalized == "audio/m4a":
            return ".m4a"
        if normalized == "audio/mpeg":
            return ".mp3"
        return ".webm"

    @classmethod
    def _normalize_audio_file_name(cls, file_name: str, mime_type: str) -> str:
        extension = cls._audio_extension_for_mime_type(mime_type)
        path = Path(file_name or f"audio{extension}")
        stem = path.stem or "audio"
        return f"{stem}{extension}"

    def _headers(self) -> dict[str, str]:
        if not self._key:
            raise HTTPException(status_code=503, detail="OpenAI API key is not configured")
        return {"Authorization": f"Bearer {self._key}", "Content-Type": "application/json"}

    @staticmethod
    def _extract_text(response_payload: dict[str, Any]) -> str:
        output_text = (response_payload.get("output_text") or "").strip()
        if output_text:
            return output_text
        chunks: list[str] = []
        for item in response_payload.get("output") or []:
            for content in item.get("content") or []:
                text_value = content.get("text")
                if isinstance(text_value, str) and text_value.strip():
                    chunks.append(text_value.strip())
        return "\n".join(chunks).strip()

    def _post_json(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        last_error: Exception | None = None
        for attempt in range(1, self._retries + 2):
            try:
                started = time.perf_counter()
                response = httpx.post(
                    f"{self._base}{path}",
                    json=payload,
                    headers=self._headers(),
                    timeout=self._timeout,
                )
                response.raise_for_status()
                elapsed_ms = int((time.perf_counter() - started) * 1000)
                logger.info("openai_request_ok path=%s attempt=%d latency_ms=%d", path, attempt, elapsed_ms)
                return response.json()
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                logger.warning("openai_request_failed path=%s attempt=%d error=%s", path, attempt, str(exc)[:220])
                if attempt > self._retries:
                    break
                time.sleep(self._retry_delay_seconds(attempt))
        raise HTTPException(status_code=502, detail=f"OpenAI request failed: {last_error}")

    def _responses_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        payload = {
            "model": self._model_generate,
            "input": [
                {
                    "role": "system",
                    "content": [{"type": "input_text", "text": system_prompt}],
                },
                {
                    "role": "user",
                    "content": [{"type": "input_text", "text": user_prompt}],
                },
            ],
        }
        response_payload = self._post_json("/responses", payload)
        text = self._extract_text(response_payload)
        if not text:
            raise HTTPException(status_code=502, detail="OpenAI returned empty response")
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=502, detail="OpenAI returned invalid JSON") from exc

    def generate_write_now(self, user_prompt: str) -> dict[str, Any]:
        return self._responses_json(WRITE_NOW_SYSTEM_PROMPT, user_prompt)

    def generate_analyze_case(self, user_prompt: str) -> dict[str, Any]:
        return self._responses_json(ANALYZE_CASE_SYSTEM_PROMPT, user_prompt)

    def refine_message(self, user_prompt: str) -> dict[str, Any]:
        return self._responses_json(REFINE_SYSTEM_PROMPT, user_prompt)

    def refine_analyze_case(self, user_prompt: str) -> dict[str, Any]:
        return self._responses_json(REFINE_ANALYZE_CASE_SYSTEM_PROMPT, user_prompt)

    def ocr_image(self, *, mime_type: str, content_bytes: bytes) -> str:
        image_b64 = base64.b64encode(content_bytes).decode("ascii")
        image_data_uri = f"data:{mime_type};base64,{image_b64}"
        payload = {
            "model": self._model_generate,
            "input": [
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": OCR_PROMPT},
                        {"type": "input_image", "image_url": image_data_uri},
                    ],
                }
            ],
        }
        response_payload = self._post_json("/responses", payload)
        text = self._extract_text(response_payload)
        if not text:
            raise HTTPException(status_code=502, detail="OpenAI OCR returned empty text")
        return text

    def transcribe_audio(self, *, file_name: str, mime_type: str, content_bytes: bytes) -> str:
        if not self._key:
            raise HTTPException(status_code=503, detail="OpenAI API key is not configured")

        normalized_mime_type = self._normalize_audio_mime_type(mime_type)
        normalized_file_name = self._normalize_audio_file_name(file_name, normalized_mime_type)
        last_error: Exception | None = None
        for attempt in range(1, self._retries + 2):
            try:
                started = time.perf_counter()
                response = httpx.post(
                    f"{self._base}/audio/transcriptions",
                    headers={"Authorization": f"Bearer {self._key}"},
                    data={"model": self._model_stt},
                    files={"file": (normalized_file_name, content_bytes, normalized_mime_type)},
                    timeout=self._timeout,
                )
                response.raise_for_status()
                elapsed_ms = int((time.perf_counter() - started) * 1000)
                logger.info("openai_stt_ok attempt=%d latency_ms=%d", attempt, elapsed_ms)
                payload = response.json()
                text = str(payload.get("text") or "").strip()
                if not text:
                    raise HTTPException(status_code=502, detail="OpenAI STT returned empty text")
                return text
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                logger.warning("openai_stt_failed attempt=%d error=%s", attempt, str(exc)[:220])
                if attempt > self._retries:
                    break
                time.sleep(self._retry_delay_seconds(attempt))
        raise HTTPException(status_code=502, detail=f"OpenAI STT request failed: {last_error}")
