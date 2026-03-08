from __future__ import annotations

import asyncio
from dataclasses import dataclass
import time
from collections.abc import Awaitable, Callable
from typing import Any, TypeVar

from aiogram.enums import ChatAction
from aiogram.types import Message

from app.config import get_settings

T = TypeVar("T")

NUMBER_OF_POINTS = 11
_DOT_SEQUENCE = tuple(a * "." for a in list(range(1, NUMBER_OF_POINTS)) + list(range(NUMBER_OF_POINTS - 2, 0, -1)))
_LAST_BUTTON_MESSAGE_BY_CHAT: dict[int, int] = {}
_BUTTON_LOCK = asyncio.Lock()
_BUTTON_SEND_LOCKS: dict[int, asyncio.Lock] = {}
_PENDING_BUTTON_VERSION_BY_CHAT: dict[int, int] = {}
_THINKING_LOCK = asyncio.Lock()
_THINKING_COUNTS_BY_CHAT: dict[int, int] = {}
_THINKING_IDLE_EVENTS_BY_CHAT: dict[int, asyncio.Event] = {}
_THINKING_STATE_BY_CHAT: dict[int, "_ThinkingState"] = {}


@dataclass
class _ThinkingState:
    status_message: Message | None
    stop_event: asyncio.Event
    typing_task: asyncio.Task[Any] | None
    status_task: asyncio.Task[Any] | None
    count: int


class ThinkingTimeoutError(TimeoutError):
    pass


def _thinking_enabled() -> bool:
    try:
        return bool(get_settings().bot_thinking_status_enabled)
    except Exception:  # noqa: BLE001
        return True


async def _typing_loop(message: Message, stop_event: asyncio.Event) -> None:
    while not stop_event.is_set():
        try:
            await message.bot.send_chat_action(chat_id=message.chat.id, action=ChatAction.TYPING)
        except Exception:  # noqa: BLE001
            pass
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=3.0)
        except TimeoutError:
            continue


async def _status_loop(status_message: Message, stop_event: asyncio.Event) -> None:
    idx = 0
    while not stop_event.is_set():
        idx += 1
        try:
            await status_message.edit_text(f"Думаю{_DOT_SEQUENCE[idx % len(_DOT_SEQUENCE)]}")
        except Exception:  # noqa: BLE001
            pass
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=0.4)
        except TimeoutError:
            continue


async def _thinking_started(chat_id: int) -> None:
    async with _THINKING_LOCK:
        previous = _THINKING_COUNTS_BY_CHAT.get(chat_id, 0)
        _THINKING_COUNTS_BY_CHAT[chat_id] = previous + 1
        idle_event = _THINKING_IDLE_EVENTS_BY_CHAT.get(chat_id)
        if idle_event is None:
            idle_event = asyncio.Event()
            _THINKING_IDLE_EVENTS_BY_CHAT[chat_id] = idle_event
        idle_event.clear()


async def _thinking_finished(chat_id: int) -> None:
    async with _THINKING_LOCK:
        previous = _THINKING_COUNTS_BY_CHAT.get(chat_id, 0)
        if previous <= 1:
            _THINKING_COUNTS_BY_CHAT.pop(chat_id, None)
            idle_event = _THINKING_IDLE_EVENTS_BY_CHAT.get(chat_id)
            if idle_event is not None:
                idle_event.set()
            return
        _THINKING_COUNTS_BY_CHAT[chat_id] = previous - 1


async def _acquire_thinking_state(message: Message) -> tuple["_ThinkingState", bool]:
    chat_id = message.chat.id
    async with _THINKING_LOCK:
        state = _THINKING_STATE_BY_CHAT.get(chat_id)
        if state is not None:
            state.count += 1
            return state, False

    status_message: Message | None = None
    try:
        status_message = await message.answer("Думаю.")
    except Exception:  # noqa: BLE001
        status_message = None
    stop_event = asyncio.Event()
    typing_task = asyncio.create_task(_typing_loop(message, stop_event))
    status_task = asyncio.create_task(_status_loop(status_message, stop_event)) if status_message is not None else None
    new_state = _ThinkingState(
        status_message=status_message,
        stop_event=stop_event,
        typing_task=typing_task,
        status_task=status_task,
        count=1,
    )
    async with _THINKING_LOCK:
        existing = _THINKING_STATE_BY_CHAT.get(chat_id)
        if existing is not None:
            new_state.stop_event.set()
            if new_state.typing_task is not None:
                new_state.typing_task.cancel()
            if new_state.status_task is not None:
                new_state.status_task.cancel()
            existing.count += 1
            return existing, False
        _THINKING_STATE_BY_CHAT[chat_id] = new_state
        return new_state, True


async def _safe_delete_status(status_message: Message | None) -> None:
    if status_message is None:
        return
    for _ in range(3):
        try:
            await status_message.delete()
            return
        except Exception:  # noqa: BLE001
            await asyncio.sleep(0.2)


async def _release_thinking_state(chat_id: int, state: "_ThinkingState") -> None:
    should_cleanup = False
    async with _THINKING_LOCK:
        current = _THINKING_STATE_BY_CHAT.get(chat_id)
        if current is not state:
            return
        current.count -= 1
        if current.count <= 0:
            _THINKING_STATE_BY_CHAT.pop(chat_id, None)
            should_cleanup = True
    if not should_cleanup:
        return
    state.stop_event.set()
    tasks = [item for item in (state.typing_task, state.status_task) if item is not None]
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
    await _safe_delete_status(state.status_message)


async def _has_active_thinking(chat_id: int) -> bool:
    async with _THINKING_LOCK:
        return _THINKING_COUNTS_BY_CHAT.get(chat_id, 0) > 0


async def _wait_for_thinking_idle(chat_id: int) -> None:
    while True:
        async with _THINKING_LOCK:
            count = _THINKING_COUNTS_BY_CHAT.get(chat_id, 0)
            idle_event = _THINKING_IDLE_EVENTS_BY_CHAT.get(chat_id)
            if count == 0:
                return
        if idle_event is None:
            await asyncio.sleep(0.05)
            continue
        await idle_event.wait()


async def invalidate_chat_pending_ui(chat_id: int) -> None:
    async with _BUTTON_LOCK:
        _PENDING_BUTTON_VERSION_BY_CHAT[chat_id] = _PENDING_BUTTON_VERSION_BY_CHAT.get(chat_id, 0) + 1
        _LAST_BUTTON_MESSAGE_BY_CHAT.pop(chat_id, None)


async def run_with_thinking(message: Message, operation: Callable[[], Awaitable[T]], *,
                            min_delay_seconds: float = 0.5) -> T:
    if not _thinking_enabled():
        return await operation()

    await _thinking_started(message.chat.id)
    state, _ = await _acquire_thinking_state(message)
    try:
        started_at = time.monotonic()
        value: T | None = None
        error: BaseException | None = None
        timeout_seconds = max(1, int(get_settings().bot_thinking_max_seconds))
        try:
            value = await asyncio.wait_for(operation(), timeout=timeout_seconds)
        except asyncio.TimeoutError:
            error = ThinkingTimeoutError(f"Thinking exceeded timeout ({timeout_seconds}s)")
        except BaseException as exc:  # noqa: BLE001
            error = exc

        elapsed = time.monotonic() - started_at
        if elapsed < min_delay_seconds:
            await asyncio.sleep(min_delay_seconds - elapsed)

        if error is not None:
            raise error
        return value  # type: ignore[return-value]
    finally:
        await _release_thinking_state(message.chat.id, state)
        await _thinking_finished(message.chat.id)


async def send_with_thinking(message: Message, text: str, **kwargs) -> Message:
    async def _chat_send_lock(chat_id: int) -> asyncio.Lock:
        async with _BUTTON_LOCK:
            lock = _BUTTON_SEND_LOCKS.get(chat_id)
            if lock is None:
                lock = asyncio.Lock()
                _BUTTON_SEND_LOCKS[chat_id] = lock
            return lock

    async def _clear_previous_buttons() -> None:
        chat_id = message.chat.id
        async with _BUTTON_LOCK:
            previous_message_id = _LAST_BUTTON_MESSAGE_BY_CHAT.pop(chat_id, None)
        if previous_message_id is None:
            return
        try:
            await message.bot.edit_message_reply_markup(chat_id=chat_id, message_id=previous_message_id,
                                                        reply_markup=None)
        except Exception:  # noqa: BLE001
            pass

    async def _track_buttons(sent_message: Message, reply_markup: Any) -> None:
        if reply_markup is None or not hasattr(reply_markup, "inline_keyboard"):
            return
        async with _BUTTON_LOCK:
            _LAST_BUTTON_MESSAGE_BY_CHAT[sent_message.chat.id] = sent_message.message_id

    async def _attach_buttons_when_idle(
        *,
        sent_message: Message,
        reply_markup: Any,
        version: int,
    ) -> None:
        if reply_markup is None or not hasattr(reply_markup, "inline_keyboard"):
            return
        await _wait_for_thinking_idle(sent_message.chat.id)
        async with _BUTTON_LOCK:
            current_version = _PENDING_BUTTON_VERSION_BY_CHAT.get(sent_message.chat.id, 0)
            if current_version != version:
                return
        chat_lock = await _chat_send_lock(sent_message.chat.id)
        async with chat_lock:
            await _clear_previous_buttons()
            try:
                await sent_message.bot.edit_message_reply_markup(
                    chat_id=sent_message.chat.id,
                    message_id=sent_message.message_id,
                    reply_markup=reply_markup,
                )
            except Exception:  # noqa: BLE001
                return
            await _track_buttons(sent_message, reply_markup)

    async def _send() -> Message:
        chat_lock = await _chat_send_lock(message.chat.id)
        async with chat_lock:
            reply_markup = kwargs.get("reply_markup")
            if reply_markup is None or not hasattr(reply_markup, "inline_keyboard"):
                await _clear_previous_buttons()
                sent = await message.answer(text, **kwargs)
                await _track_buttons(sent, reply_markup)
                return sent

            if await _has_active_thinking(message.chat.id):
                async with _BUTTON_LOCK:
                    version = _PENDING_BUTTON_VERSION_BY_CHAT.get(message.chat.id, 0) + 1
                    _PENDING_BUTTON_VERSION_BY_CHAT[message.chat.id] = version
                send_kwargs = dict(kwargs)
                send_kwargs["reply_markup"] = None
                sent = await message.answer(text, **send_kwargs)
                asyncio.create_task(_attach_buttons_when_idle(sent_message=sent, reply_markup=reply_markup, version=version))
                return sent

            await _clear_previous_buttons()
            sent = await message.answer(text, **kwargs)
            await _track_buttons(sent, reply_markup)
            return sent

    if not _thinking_enabled():
        return await _send()

    return await run_with_thinking(message, _send)
