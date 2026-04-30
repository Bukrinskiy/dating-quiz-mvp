from __future__ import annotations

import httpx

from app.core.config import Settings
from app.services.openai_bot import OpenAIBotClient


def make_settings() -> Settings:
    return Settings(
        openai_api_key="test-key",
        openai_api_base="https://api.openai.com/v1",
        bot_openai_model_generate="gpt-4.1-mini",
        bot_openai_model_stt="gpt-4o-transcribe",
        bot_openai_timeout_seconds=30,
        bot_openai_retries=0,
    )


def test_transcribe_audio_normalizes_webm_filename_and_mime(monkeypatch) -> None:
    captured: dict[str, object] = {}

    def fake_post(url: str, *, headers: dict[str, str], data: dict[str, str], files: dict[str, tuple[str, bytes, str]], timeout: float):
        captured["url"] = url
        captured["headers"] = headers
        captured["data"] = data
        captured["files"] = files
        captured["timeout"] = timeout
        return httpx.Response(200, json={"text": "ok"}, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx, "post", fake_post)

    client = OpenAIBotClient(make_settings())
    text = client.transcribe_audio(
        file_name="telegram-audio.ogg",
        mime_type="audio/webm;codecs=opus",
        content_bytes=b"webm-bytes",
    )

    assert text == "ok"
    assert captured["url"] == "https://api.openai.com/v1/audio/transcriptions"
    assert captured["data"] == {"model": "gpt-4o-transcribe"}
    assert captured["files"] == {"file": ("telegram-audio.webm", b"webm-bytes", "audio/webm")}
