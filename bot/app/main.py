from __future__ import annotations

import asyncio
import logging

from aiohttp import web
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application

from app.client.backend_api import BackendApiClient
from app.config import get_settings
from app.handlers.premium import router as premium_router
from app.handlers.restore import router as restore_router
from app.handlers.start import router as start_router
from app.middlewares.access_gate import AccessGateMiddleware

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("quiz.bot")


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
    dp.message.middleware(AccessGateMiddleware(backend=backend, public_commands=public_commands, pay_url=pay_url))
    dp["backend"] = backend
    dp["pay_url"] = pay_url
    dp.include_router(start_router)
    dp.include_router(restore_router)
    dp.include_router(premium_router)
    return dp


async def run_polling() -> None:
    settings = get_settings()
    backend = BackendApiClient(base_url=settings.bot_backend_base_url, internal_token=settings.bot_internal_token)
    bot = Bot(token=settings.telegram_bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = await _build_dispatcher(backend, settings.allowed_public_commands_set, settings.pay_url)

    health_runner = await _start_health_server(port=settings.bot_port, mode="polling")
    logger.info("bot_start_polling")
    try:
        await bot.delete_webhook(drop_pending_updates=False)
        await dp.start_polling(bot)
    finally:
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

    try:
        while True:
            await asyncio.sleep(3600)
    except asyncio.CancelledError:
        logger.info("bot_webhook_shutdown")
        raise
    finally:
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
