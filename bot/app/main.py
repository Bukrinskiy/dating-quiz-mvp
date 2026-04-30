from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import logging
import socket

from aiohttp import web
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.types import BotCommand
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import ErrorEvent
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application

from app.client.backend_api import BackendApiClient
from app.config import get_settings
from app.handlers.admin_access import router as admin_access_router
from app.handlers.advice import router as advice_router
from app.handlers.restore import router as restore_router
from app.handlers.start import router as start_router
from app.handlers.support import router as support_router
from app.middlewares.access_gate import AccessGateMiddleware
from app.middlewares.state_interrupt import StateInterruptMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("quiz.bot")


def _runtime_host() -> str:
    try:
        return socket.gethostname()
    except Exception:  # noqa: BLE001
        return "unknown-host"


def _runtime_timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


async def _global_error_handler(event: ErrorEvent) -> bool:
    logger.exception("bot_unhandled_error update=%s", event.update, exc_info=event.exception)
    fallback_text = "Произошла ошибка. Попробуйте еще раз или используйте /reset."
    try:
        update = event.update
        message = getattr(update, "message", None)
        if message is not None:
            await message.answer(fallback_text)
            return True
        callback_query = getattr(update, "callback_query", None)
        if callback_query is not None:
            if callback_query.message is not None:
                await callback_query.message.answer(fallback_text)
            await callback_query.answer("Произошла ошибка", show_alert=True)
            return True
    except Exception:  # noqa: BLE001
        logger.exception("bot_unhandled_error_notify_failed")
    return True


async def _sync_bot_commands(bot: Bot) -> None:
    await bot.set_my_commands(
        [
            BotCommand(command="start", description="Запуск и статус доступа"),
            BotCommand(command="advice", description="Начать консультацию"),
            BotCommand(command="reset", description="Сбросить активную сессию"),
            BotCommand(command="restore", description="Восстановить доступ"),
            BotCommand(command="support", description="Написать в поддержку"),
            BotCommand(command="grant_access", description="Выдать ручной доступ по email"),
            BotCommand(command="revoke_access", description="Отозвать ручной доступ по email"),
        ]
    )


def _register_health_route(app: web.Application, mode: str) -> None:
    async def health_handler(_: web.Request) -> web.Response:
        return web.json_response({"status": "ok", "mode": mode})

    app.router.add_get("/health", health_handler)


async def _start_health_server(*, port: int, mode: str) -> web.AppRunner:
    app = web.Application()
    _register_health_route(app, mode)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host="0.0.0.0", port=port)
    await site.start()
    logger.info("bot_health_server_started", extra={"port": port, "mode": mode})
    return runner


async def _build_dispatcher(backend: BackendApiClient, public_commands: set[str], pay_url: str) -> Dispatcher:
    dp = Dispatcher(storage=MemoryStorage())
    dp.errors.register(_global_error_handler)
    dp.message.outer_middleware(StateInterruptMiddleware())
    dp.message.middleware(AccessGateMiddleware(backend=backend, public_commands=public_commands, pay_url=pay_url))
    dp["backend"] = backend
    dp["pay_url"] = pay_url
    dp.include_router(admin_access_router)
    dp.include_router(start_router)
    dp.include_router(restore_router)
    dp.include_router(support_router)
    dp.include_router(advice_router)
    return dp


async def _notify_admins_bot_started(bot: Bot, *, admin_ids: list[str], mode: str) -> None:
    if not admin_ids:
        return
    text = (
        "Бот запущен.\n"
        f"Режим: {mode}\n"
        f"Хост: {_runtime_host()}\n"
        f"Время: {_runtime_timestamp()}"
    )
    for admin_id in admin_ids:
        try:
            await bot.send_message(chat_id=admin_id, text=text)
        except Exception as exc:  # noqa: BLE001
            logger.warning("bot_startup_admin_notify_failed admin_id=%s error=%s", admin_id, str(exc)[:240])
        else:
            logger.info("bot_startup_admin_notified admin_id=%s mode=%s", admin_id, mode)


async def _notify_admins_bot_stopped(bot: Bot, *, admin_ids: list[str], mode: str, reason: str) -> None:
    if not admin_ids:
        return
    text = (
        "Бот остановлен.\n"
        f"Режим: {mode}\n"
        f"Хост: {_runtime_host()}\n"
        f"Время: {_runtime_timestamp()}\n"
        f"Причина: {reason}"
    )
    for admin_id in admin_ids:
        try:
            await bot.send_message(chat_id=admin_id, text=text)
        except Exception as exc:  # noqa: BLE001
            logger.warning("bot_shutdown_admin_notify_failed admin_id=%s error=%s", admin_id, str(exc)[:240])
        else:
            logger.info("bot_shutdown_admin_notified admin_id=%s mode=%s", admin_id, mode)


async def run_polling() -> None:
    settings = get_settings()
    backend = BackendApiClient(base_url=settings.bot_backend_base_url, internal_token=settings.bot_internal_token)
    bot = Bot(token=settings.telegram_bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = await _build_dispatcher(backend, settings.allowed_public_commands_set, settings.pay_url)

    health_runner = await _start_health_server(port=settings.bot_port, mode="polling")
    logger.info("bot_start_polling")
    stop_reason = "normal shutdown"
    try:
        await bot.delete_webhook(drop_pending_updates=False)
        await _sync_bot_commands(bot)
        await _notify_admins_bot_started(bot, admin_ids=settings.admin_ids_list, mode="polling")
        await dp.start_polling(bot)
    except asyncio.CancelledError:
        stop_reason = "cancelled"
        raise
    except Exception as exc:  # noqa: BLE001
        stop_reason = f"error: {exc.__class__.__name__}"
        raise
    finally:
        await _notify_admins_bot_stopped(bot, admin_ids=settings.admin_ids_list, mode="polling", reason=stop_reason)
        await health_runner.cleanup()
        await backend.close()
        await bot.session.close()


async def run_webhook() -> None:
    settings = get_settings()
    backend = BackendApiClient(base_url=settings.bot_backend_base_url, internal_token=settings.bot_internal_token)
    bot = Bot(token=settings.telegram_bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = await _build_dispatcher(backend, settings.allowed_public_commands_set, settings.pay_url)

    await bot.set_webhook(settings.webhook_public_url, drop_pending_updates=False)
    logger.info("bot_set_webhook", extra={"url": settings.webhook_public_url})
    await _sync_bot_commands(bot)
    await _notify_admins_bot_started(bot, admin_ids=settings.admin_ids_list, mode="webhook")

    app = web.Application()
    webhook_path = settings.webhook_internal_path
    _register_health_route(app, "webhook")
    SimpleRequestHandler(dispatcher=dp, bot=bot).register(app, path=webhook_path)
    setup_application(app, dp, bot=bot)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host="0.0.0.0", port=settings.bot_port)
    await site.start()

    logger.info("bot_webhook_server_started", extra={"port": settings.bot_port, "path": webhook_path})

    stop_reason = "normal shutdown"
    try:
        while True:
            await asyncio.sleep(3600)
    except asyncio.CancelledError:
        stop_reason = "cancelled"
        logger.info("bot_webhook_shutdown")
        raise
    except Exception as exc:  # noqa: BLE001
        stop_reason = f"error: {exc.__class__.__name__}"
        raise
    finally:
        await _notify_admins_bot_stopped(bot, admin_ids=settings.admin_ids_list, mode="webhook", reason=stop_reason)
        await bot.delete_webhook(drop_pending_updates=False)
        await runner.cleanup()
        await backend.close()
        await bot.session.close()


async def main() -> None:
    settings = get_settings()
    if settings.normalized_mode == "webhook":
        await run_webhook()
        return
    await run_polling()


if __name__ == "__main__":
    asyncio.run(main())
