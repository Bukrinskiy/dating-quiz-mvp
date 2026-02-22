from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.router import api_router
from app.cli.run_migrations import run_migrations


def _resolve_log_level() -> int:
    raw_level = os.getenv("APP_LOG_LEVEL", "INFO").upper()
    return getattr(logging, raw_level, logging.INFO)


def _configure_logging() -> None:
    level = _resolve_log_level()
    fmt = "%(asctime)s %(levelname)s %(name)s %(message)s"
    logging.basicConfig(level=level, format=fmt)
    logging.getLogger().setLevel(level)
    logging.getLogger("quiz").setLevel(level)


_configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _configure_logging()
    logging.info("app_startup logging_configured level=%s", logging.getLevelName(_resolve_log_level()))
    run_migrations()
    _configure_logging()
    yield


app = FastAPI(title="quiz-backend", lifespan=lifespan, )
app.include_router(api_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
