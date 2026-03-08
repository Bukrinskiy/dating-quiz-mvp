from __future__ import annotations

import base64
from datetime import datetime
import logging
import re
import uuid

from aiogram import F, Router
from aiogram.filters import Command, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message

from app.client.backend_api import BackendApiClient
from app.states.advice import AdviceFlow
from app.utils.thinking import ThinkingTimeoutError, invalidate_chat_pending_ui, run_with_thinking, send_with_thinking

logger = logging.getLogger("quiz.bot")

router = Router(name="advice")
_FORWARD_SUMMARY_RE = re.compile(
    r"^\[(?P<source>text|audio|media)\]\[forward\]\[role:(?P<role>[^\]]+)\]"
    r"(?:\[name:(?P<name>[^\]]*)\])?"
    r"(?:\[sent_at:(?P<sent_at>[^\]]+)\])?\s*",
    flags=re.IGNORECASE,
)


def _mode_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Написать сейчас", callback_data="mode:write_now")],
            [InlineKeyboardButton(text="Разобрать ситуацию", callback_data="mode:analyze_case")],
        ]
    )


def _batch_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Добавлю еще", callback_data="batch:more")],
            [InlineKeyboardButton(text="Готово", callback_data="batch:close")],
        ]
    )


def _confirm_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="✅ Верно", callback_data="confirm:yes")],
            [InlineKeyboardButton(text="✏️ Уточнить", callback_data="confirm:edit")],
        ]
    )


def _refine_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Уточнить", callback_data="refine:ask")],
            [InlineKeyboardButton(text="Завершить", callback_data="refine:finish")],
            [InlineKeyboardButton(text="Новая ситуация", callback_data="refine:new_session")],
        ]
    )


def _render_generation(payload: dict, mode: str) -> str:
    ui = payload.get("ui_payload") or {}
    if mode == "write_now":
        risks = "\n".join(f"- {x}" for x in (ui.get("risks") or []))
        alternatives = "\n".join(f"- {x}" for x in (ui.get("alternatives") or []))
        avoid = "\n".join(f"- {x}" for x in (ui.get("avoid_list") or []))
        return (
            f"Сообщение:\n{ui.get('primary_message', '')}\n\n"
            f"Почему:\n{ui.get('why', '')}\n\n"
            f"Риски:\n{risks or '- нет'}\n\n"
            f"Избегать:\n{avoid or '- нет'}\n\n"
            f"Следующий шаг:\n{ui.get('next_step', '')}\n\n"
            f"Простой вариант:\n{ui.get('fallback_simple_version', '')}\n\n"
            f"Альтернативы:\n{alternatives or '- нет'}"
        )

    p24 = "\n".join(f"- {x}" for x in (ui.get("plan_24h") or []))
    prep = "\n".join(f"- {x}" for x in (ui.get("plan_if_reply") or []))
    pno = "\n".join(f"- {x}" for x in (ui.get("plan_if_no_reply") or []))
    avoid = "\n".join(f"- {x}" for x in (ui.get("avoid_list") or []))
    return (
        f"Диагноз:\n{ui.get('diagnosis', '')}\n\n"
        f"Точка рычага:\n{ui.get('core_leverage', '')}\n\n"
        f"План 24ч:\n{p24 or '- нет'}\n\n"
        f"Если ответит:\n{prep or '- нет'}\n\n"
        f"Если не ответит:\n{pno or '- нет'}\n\n"
        f"Шаблон:\n{ui.get('message_template', '')}\n\n"
        f"Избегать:\n{avoid or '- нет'}"
    )


def _role_fallback_ru(role: str) -> str:
    value = (role or "").strip().upper()
    if value == "USER_SELF":
        return "Вы"
    if value == "USER_PEER":
        return "Собеседник"
    return "Участник"


def _format_sent_at_ru(sent_at_value: str) -> str:
    raw = (sent_at_value or "").strip()
    if not raw:
        return ""
    text = raw[:-1] + "+00:00" if raw.endswith("Z") else raw
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return ""
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def _prettify_forward_summary_line(line: str) -> str:
    value = (line or "").strip()
    if not value:
        return value
    match = _FORWARD_SUMMARY_RE.match(value)
    if not match:
        return value
    source = (match.group("source") or "").lower()
    role = match.group("role") or ""
    name = (match.group("name") or "").strip()
    sent_at_value = _format_sent_at_ru(match.group("sent_at") or "")
    rest = value[match.end() :].strip()
    actor = name or _role_fallback_ru(role)
    sent_block = f" [{sent_at_value}]" if sent_at_value else ""
    head = f"[{source}] {actor}{sent_block}".strip()
    if not rest:
        return head
    return f"{head} {rest}".strip()


def _prettify_summary_for_telegram(text: str) -> str:
    lines = (text or "").splitlines()
    if not lines:
        return text
    return "\n".join(_prettify_forward_summary_line(line) for line in lines)


def _split_summary_text(text: str, max_chunk_len: int = 3200) -> list[str]:
    value = (text or "").strip()
    if not value:
        return [""]
    if len(value) <= max_chunk_len:
        return [value]

    parts: list[str] = []
    current = ""
    for line in value.splitlines():
        candidate = f"{current}\n{line}".strip() if current else line
        if len(candidate) <= max_chunk_len:
            current = candidate
            continue
        if current:
            parts.append(current)
            current = line
            continue
        # Extremely long single line fallback.
        for idx in range(0, len(line), max_chunk_len):
            parts.append(line[idx : idx + max_chunk_len])
        current = ""
    if current:
        parts.append(current)
    return parts or [value]


async def _send_numbered_summary(
    message: Message,
    *,
    title: str,
    summary_text: str,
    state: FSMContext | None = None,
    session_id: str | None = None,
    flow_nonce: str | None = None,
    final_reply_markup: InlineKeyboardMarkup | None = None,
) -> None:
    chunks = _split_summary_text(_prettify_summary_for_telegram(summary_text))
    total = len(chunks)
    for index, chunk in enumerate(chunks, start=1):
        if state is not None and session_id and flow_nonce:
            if not await _is_flow_current(state, session_id=session_id, flow_nonce=flow_nonce):
                return
        prefix = f"{title} (часть {index}/{total})" if total > 1 else title
        reply_markup = final_reply_markup if index == total else None
        await send_with_thinking(message, f"{prefix}:\n\n{chunk}", reply_markup=reply_markup)


async def _send_asset(
    message: Message,
    *,
    backend: BackendApiClient,
    session_id: str,
    telegram_user_id: str,
    asset_type: str,
    payload: dict,
) -> str:
    response = await backend.session_asset(
        session_id=session_id,
        telegram_user_id=telegram_user_id,
        asset_type=asset_type,
        payload=payload,
        telegram_message_id=message.message_id,
    )
    summary = response.get("summary_for_user") or "Контекст добавлен."
    return _prettify_summary_for_telegram(summary)


async def _is_flow_current(state: FSMContext, *, session_id: str, flow_nonce: str) -> bool:
    data = await state.get_data()
    return str(data.get("session_id") or "") == session_id and str(data.get("flow_nonce") or "") == flow_nonce


async def _hard_reset_session(message: Message, state: FSMContext, backend: BackendApiClient, *, telegram_user_id: str) -> int:
    data = await state.get_data()
    session_id = str(data.get("session_id") or "")
    closed_sessions = 0
    backend_error: Exception | None = None

    await invalidate_chat_pending_ui(message.chat.id)
    try:
        if session_id:
            await backend.session_reset(session_id=session_id, telegram_user_id=telegram_user_id)
            closed_sessions = 1
    except Exception as exc:  # noqa: BLE001
        backend_error = exc

    try:
        payload = await backend.session_reset_active(telegram_user_id=telegram_user_id)
        closed_sessions = max(closed_sessions, int(payload.get("closed_sessions") or 0))
        backend_error = None
    except Exception as exc:  # noqa: BLE001
        if backend_error is None:
            backend_error = exc
    finally:
        await state.clear()
        await invalidate_chat_pending_ui(message.chat.id)

    if backend_error is not None:
        raise backend_error
    return closed_sessions


async def _handle_timeout_reset(message: Message, state: FSMContext, backend: BackendApiClient, telegram_user_id: str) -> None:
    try:
        await _hard_reset_session(message, state, backend, telegram_user_id=telegram_user_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("bot_timeout_reset_failed user=%s error=%s", telegram_user_id, str(exc)[:240])
    await send_with_thinking(
        message,
        "Произошла ошибка: операция выполнялась слишком долго. Сессию принудительно сбросил, начните заново через /advice.",
    )


async def _extract_file_payload(message: Message) -> tuple[str, dict] | None:
    is_forward = message.forward_origin is not None
    forward_role: str | None = None
    forward_sent_at: str | None = None
    forward_display_name: str | None = None
    if is_forward:
        forward_role, forward_sent_at, forward_display_name = _forward_role_and_metadata(message)

    if message.photo:
        file_id = message.photo[-1].file_id
        file = await message.bot.get_file(file_id)
        file_bytes = await message.bot.download_file(file.file_path)
        content = file_bytes.read()
        payload = {
            "caption": message.caption or "",
            "media": {
                "mime_type": "image/jpeg",
                "content_base64": base64.b64encode(content).decode("ascii"),
                "file_name": f"telegram-photo-{message.message_id}.jpg",
            },
        }
        if is_forward:
            payload["role"] = forward_role
            payload["sent_at"] = forward_sent_at
            payload["display_name"] = forward_display_name
        return (
            "image",
            payload,
        )

    audio = message.audio or message.voice
    if audio:
        file = await message.bot.get_file(audio.file_id)
        file_bytes = await message.bot.download_file(file.file_path)
        content = file_bytes.read()
        mime = getattr(audio, "mime_type", None) or "audio/ogg"
        ext = "ogg" if "ogg" in mime else "mp3"
        payload = {
            "duration_seconds": getattr(audio, "duration", None),
            "media": {
                "mime_type": mime,
                "content_base64": base64.b64encode(content).decode("ascii"),
                "file_name": f"telegram-audio-{message.message_id}.{ext}",
                "duration_seconds": getattr(audio, "duration", None),
            },
        }
        if is_forward:
            payload["role"] = forward_role
            payload["sent_at"] = forward_sent_at
            payload["display_name"] = forward_display_name
        return (
            "audio",
            payload,
        )

    return None


def _forward_role_and_metadata(message: Message) -> tuple[str, str | None, str | None]:
    forward_origin = message.forward_origin
    if forward_origin is None:
        return "USER_PEER", None, None

    role = "USER_PEER"
    display_name: str | None = None
    sender_user = getattr(forward_origin, "sender_user", None)
    if sender_user is not None and message.from_user is not None and str(sender_user.id) == str(message.from_user.id):
        role = "USER_SELF"
    if sender_user is not None:
        display_name = sender_user.full_name

    sent_at = getattr(forward_origin, "date", None) or getattr(message, "forward_date", None)
    sent_at_value = sent_at.isoformat() if sent_at is not None and hasattr(sent_at, "isoformat") else None
    return role, sent_at_value, display_name


@router.message(Command("advice"))
async def advice_entry(message: Message, state: FSMContext) -> None:
    await state.clear()
    await invalidate_chat_pending_ui(message.chat.id)
    await state.set_state(AdviceFlow.choosing_mode)
    await send_with_thinking(message, "Выберите режим консультации:", reply_markup=_mode_keyboard())


@router.callback_query(F.data.startswith("mode:"))
async def advice_mode_pick(callback: CallbackQuery, state: FSMContext, backend: BackendApiClient) -> None:
    mode = (callback.data or "").split(":", 1)[1]
    if mode not in {"write_now", "analyze_case"}:
        await callback.answer("Неизвестный режим", show_alert=True)
        return
    telegram_user_id = str(callback.from_user.id)
    try:
        session = await run_with_thinking(
            callback.message,
            lambda: backend.session_start(telegram_user_id=telegram_user_id, mode=mode),
        )
    except ThinkingTimeoutError:
        await send_with_thinking(
            callback.message,
            "Произошла ошибка: операция выполнялась слишком долго. Попробуйте снова через /advice.",
        )
        await callback.answer()
        return
    except Exception as exc:  # noqa: BLE001
        await send_with_thinking(callback.message, f"Не удалось запустить сессию: {BackendApiClient.parse_error_message(exc)}")
        await callback.answer()
        return

    await state.update_data(session_id=session.get("session_id"), mode=mode, flow_nonce=uuid.uuid4().hex)
    await state.set_state(AdviceFlow.collecting_context)
    await send_with_thinking(
        callback.message,
        "Отправьте первый фрагмент контекста: текст, пересланные сообщения, фото или аудио.",
    )
    await callback.answer()


@router.callback_query(F.data == "batch:more")
async def batch_more(callback: CallbackQuery) -> None:
    await callback.answer("Добавляйте следующий фрагмент")


@router.callback_query(F.data == "batch:close")
async def batch_close(callback: CallbackQuery, state: FSMContext, backend: BackendApiClient) -> None:
    data = await state.get_data()
    session_id = str(data.get("session_id") or "")
    flow_nonce = str(data.get("flow_nonce") or "")
    if not session_id:
        await callback.answer("Сессия не найдена", show_alert=True)
        return
    telegram_user_id = str(callback.from_user.id)
    try:
        result = await run_with_thinking(
            callback.message,
            lambda: backend.session_batch_close(session_id=session_id, telegram_user_id=telegram_user_id),
        )
    except ThinkingTimeoutError:
        await _handle_timeout_reset(callback.message, state, backend, telegram_user_id)
        await callback.answer()
        return
    except Exception as exc:  # noqa: BLE001
        await send_with_thinking(callback.message, f"Не удалось закрыть batch: {BackendApiClient.parse_error_message(exc)}")
        await callback.answer()
        return
    if not await _is_flow_current(state, session_id=session_id, flow_nonce=flow_nonce):
        await callback.answer()
        return

    if result.get("needs_confirmation"):
        await _send_numbered_summary(
            callback.message,
            title="Проверьте контекст",
            summary_text=str(result.get("context_preview") or ""),
            state=state,
            session_id=session_id,
            flow_nonce=flow_nonce,
            final_reply_markup=_confirm_keyboard(),
        )
        await callback.answer()
        return

    try:
        generated = await run_with_thinking(
            callback.message,
            lambda: backend.session_generate(session_id=session_id, telegram_user_id=telegram_user_id),
        )
    except ThinkingTimeoutError:
        await _handle_timeout_reset(callback.message, state, backend, telegram_user_id)
        await callback.answer()
        return
    except Exception as exc:  # noqa: BLE001
        await send_with_thinking(
            callback.message,
            f"Не удалось сгенерировать ответ: {BackendApiClient.parse_error_message(exc)}",
        )
        await callback.answer()
        return
    if not await _is_flow_current(state, session_id=session_id, flow_nonce=flow_nonce):
        await callback.answer()
        return

    mode = str(data.get("mode") or "write_now")
    await state.set_state(AdviceFlow.awaiting_refinement)
    await send_with_thinking(callback.message, _render_generation(generated, mode), reply_markup=_refine_keyboard())
    await callback.answer()


@router.callback_query(F.data == "confirm:yes")
async def confirm_yes(callback: CallbackQuery, state: FSMContext, backend: BackendApiClient) -> None:
    data = await state.get_data()
    session_id = str(data.get("session_id") or "")
    flow_nonce = str(data.get("flow_nonce") or "")
    telegram_user_id = str(callback.from_user.id)
    try:
        await run_with_thinking(
            callback.message,
            lambda: backend.session_confirm_context(
                session_id=session_id,
                telegram_user_id=telegram_user_id,
                action="confirm:yes",
            ),
        )
        generated = await run_with_thinking(
            callback.message,
            lambda: backend.session_generate(session_id=session_id, telegram_user_id=telegram_user_id),
        )
    except ThinkingTimeoutError:
        await _handle_timeout_reset(callback.message, state, backend, telegram_user_id)
        await callback.answer()
        return
    except Exception as exc:  # noqa: BLE001
        await send_with_thinking(callback.message, f"Ошибка подтверждения: {BackendApiClient.parse_error_message(exc)}")
        await callback.answer()
        return
    if not await _is_flow_current(state, session_id=session_id, flow_nonce=flow_nonce):
        await callback.answer()
        return

    mode = str(data.get("mode") or "write_now")
    await state.set_state(AdviceFlow.awaiting_refinement)
    await send_with_thinking(callback.message, _render_generation(generated, mode), reply_markup=_refine_keyboard())
    await callback.answer()


@router.callback_query(F.data == "confirm:edit")
async def confirm_edit(callback: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(AdviceFlow.awaiting_confirm_edit)
    await send_with_thinking(callback.message, "Опишите уточнение свободным текстом.")
    await callback.answer()


@router.message(AdviceFlow.awaiting_confirm_edit, F.text)
async def confirm_edit_text(message: Message, state: FSMContext, backend: BackendApiClient) -> None:
    data = await state.get_data()
    session_id = str(data.get("session_id") or "")
    flow_nonce = str(data.get("flow_nonce") or "")
    telegram_user_id = str(message.from_user.id) if message.from_user else ""
    edit_text = (message.text or "").strip()
    try:
        await run_with_thinking(
            message,
            lambda: backend.session_confirm_context(
                session_id=session_id,
                telegram_user_id=telegram_user_id,
                action="confirm:edit",
                edit_text=edit_text,
            ),
        )
        updated = await run_with_thinking(
            message,
            lambda: backend.session_batch_close(session_id=session_id, telegram_user_id=telegram_user_id),
        )
    except ThinkingTimeoutError:
        await _handle_timeout_reset(message, state, backend, telegram_user_id)
        return
    except Exception as exc:  # noqa: BLE001
        await send_with_thinking(message, f"Не удалось сохранить уточнение: {BackendApiClient.parse_error_message(exc)}")
        return
    if not await _is_flow_current(state, session_id=session_id, flow_nonce=flow_nonce):
        return

    await state.set_state(AdviceFlow.collecting_context)
    await _send_numbered_summary(
        message,
        title="Обновленный контекст",
        summary_text=str(updated.get("context_preview") or ""),
        state=state,
        session_id=session_id,
        flow_nonce=flow_nonce,
        final_reply_markup=_confirm_keyboard(),
    )


@router.callback_query(F.data == "refine:ask")
async def refine_ask(callback: CallbackQuery, state: FSMContext) -> None:
    await state.set_state(AdviceFlow.awaiting_refine_text)
    await send_with_thinking(callback.message, "Напишите, что нужно изменить в ответе.")
    await callback.answer()


@router.message(AdviceFlow.awaiting_refine_text, F.text)
async def refine_text(message: Message, state: FSMContext, backend: BackendApiClient) -> None:
    data = await state.get_data()
    session_id = str(data.get("session_id") or "")
    flow_nonce = str(data.get("flow_nonce") or "")
    telegram_user_id = str(message.from_user.id) if message.from_user else ""
    mode = str(data.get("mode") or "write_now")

    try:
        refined = await run_with_thinking(
            message,
            lambda: backend.session_refine(
                session_id=session_id,
                telegram_user_id=telegram_user_id,
                command=(message.text or "").strip(),
            ),
        )
    except ThinkingTimeoutError:
        await _handle_timeout_reset(message, state, backend, telegram_user_id)
        return
    except Exception as exc:  # noqa: BLE001
        await send_with_thinking(message, f"Не удалось уточнить ответ: {BackendApiClient.parse_error_message(exc)}")
        return
    if not await _is_flow_current(state, session_id=session_id, flow_nonce=flow_nonce):
        return

    await state.set_state(AdviceFlow.awaiting_refinement)
    await send_with_thinking(message, _render_generation(refined, mode), reply_markup=_refine_keyboard())


@router.callback_query(F.data == "refine:finish")
async def refine_finish(callback: CallbackQuery, state: FSMContext, backend: BackendApiClient) -> None:
    telegram_user_id = str(callback.from_user.id)
    try:
        await _hard_reset_session(callback.message, state, backend, telegram_user_id=telegram_user_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("bot_refine_finish_reset_failed error=%s", str(exc)[:240])
        await send_with_thinking(callback.message, "Произошла ошибка. Не удалось завершить сессию, попробуйте /reset.")
        await callback.answer()
        return
    await send_with_thinking(callback.message, "Сессию завершил. Для нового кейса используйте /advice.")
    await callback.answer()


@router.callback_query(F.data == "refine:new_session")
async def refine_new_session(callback: CallbackQuery, state: FSMContext, backend: BackendApiClient) -> None:
    telegram_user_id = str(callback.from_user.id)
    try:
        await _hard_reset_session(callback.message, state, backend, telegram_user_id=telegram_user_id)
    except Exception as exc:  # noqa: BLE001
        logger.warning("bot_refine_new_session_reset_failed error=%s", str(exc)[:240])
        await send_with_thinking(callback.message, "Произошла ошибка. Не удалось сбросить сессию, попробуйте /reset.")
        await callback.answer()
        return

    await state.set_state(AdviceFlow.choosing_mode)
    await send_with_thinking(callback.message, "Открываем новую ситуацию. Выберите режим:", reply_markup=_mode_keyboard())
    await callback.answer()


@router.message(Command("reset"))
async def reset_command(message: Message, state: FSMContext, backend: BackendApiClient) -> None:
    telegram_user_id = str(message.from_user.id) if message.from_user else ""
    try:
        closed_sessions = await _hard_reset_session(message, state, backend, telegram_user_id=telegram_user_id)
    except Exception as exc:  # noqa: BLE001
        await send_with_thinking(
            message,
            f"Произошла ошибка. Не удалось закрыть активную сессию: {BackendApiClient.parse_error_message(exc)}",
        )
        return
    if closed_sessions > 0:
        await send_with_thinking(message, "Активная сессия полностью сброшена. Для нового кейса используйте /advice.")
        return
    await send_with_thinking(message, "Активной сессии не было. Для нового кейса используйте /advice.")


@router.message(AdviceFlow.collecting_context)
async def collect_context(message: Message, state: FSMContext, backend: BackendApiClient) -> None:
    data = await state.get_data()
    session_id = str(data.get("session_id") or "")
    flow_nonce = str(data.get("flow_nonce") or "")
    telegram_user_id = str(message.from_user.id) if message.from_user else ""
    if not session_id or not telegram_user_id:
        await state.clear()
        await send_with_thinking(message, "Сессия не найдена. Запустите /advice заново.")
        return

    extracted = await _extract_file_payload(message)
    if extracted is not None:
        asset_type, payload = extracted
        try:
            summary = await run_with_thinking(
                message,
                lambda: _send_asset(
                    message,
                    backend=backend,
                    session_id=session_id,
                    telegram_user_id=telegram_user_id,
                    asset_type=asset_type,
                    payload=payload,
                ),
            )
            if not await _is_flow_current(state, session_id=session_id, flow_nonce=flow_nonce):
                return
            await send_with_thinking(message, f"Принял: {summary}", reply_markup=_batch_keyboard())
        except ThinkingTimeoutError:
            await _handle_timeout_reset(message, state, backend, telegram_user_id)
        except Exception as exc:  # noqa: BLE001
            await send_with_thinking(
                message,
                f"Произошла ошибка. Не удалось загрузить медиа: {BackendApiClient.parse_error_message(exc)}",
            )
        return

    if message.text:
        text = message.text.strip()
        asset_type = "forward" if message.forward_origin is not None else "text"
        payload = {"text": text}
        if asset_type == "forward":
            role, sent_at, display_name = _forward_role_and_metadata(message)
            payload["role"] = role
            payload["sent_at"] = sent_at
            payload["display_name"] = display_name
        try:
            summary = await run_with_thinking(
                message,
                lambda: _send_asset(
                    message,
                    backend=backend,
                    session_id=session_id,
                    telegram_user_id=telegram_user_id,
                    asset_type=asset_type,
                    payload=payload,
                ),
            )
            if not await _is_flow_current(state, session_id=session_id, flow_nonce=flow_nonce):
                return
            await send_with_thinking(message, f"Принял: {summary}", reply_markup=_batch_keyboard())
        except ThinkingTimeoutError:
            await _handle_timeout_reset(message, state, backend, telegram_user_id)
        except Exception as exc:  # noqa: BLE001
            await send_with_thinking(
                message,
                f"Произошла ошибка. Не удалось добавить текст: {BackendApiClient.parse_error_message(exc)}",
            )
        return

    await send_with_thinking(message, "Поддерживаются текст, пересланные сообщения, фото и аудио.")


@router.message(StateFilter(None), F.text, ~F.text.startswith("/"))
async def out_of_flow_text(message: Message) -> None:
    await send_with_thinking(message, "Чтобы начать консультацию, используйте /advice.")
