from __future__ import annotations

import hashlib
import logging
from pathlib import Path
import time

import psycopg
from alembic import command
from alembic.config import Config

from app.core.config import get_settings

LOCK_NAMESPACE = b"dating-quiz-migrations"
logger = logging.getLogger("quiz.migrations")


def _lock_id() -> int:
    digest = hashlib.sha256(LOCK_NAMESPACE).digest()
    return int.from_bytes(digest[:8], "big", signed=True)


def _alembic_config() -> Config:
    alembic_ini = Path(__file__).resolve().parents[2] / "alembic.ini"
    if not alembic_ini.exists():
        raise FileNotFoundError(f"Alembic config not found: {alembic_ini}")
    return Config(str(alembic_ini))


def run_migrations() -> None:
    settings = get_settings()
    db_url = settings.resolved_database_url
    cfg = _alembic_config()

    # Use advisory lock in PostgreSQL to avoid concurrent migration runners.
    if db_url.startswith("postgresql"):
        dsn = db_url.replace("+psycopg", "")
        lock_id = _lock_id()
        last_error: Exception | None = None
        for attempt in range(1, 31):
            try:
                with psycopg.connect(dsn, autocommit=True) as conn:
                    with conn.cursor() as cursor:
                        cursor.execute("SELECT pg_advisory_lock(%s);", (lock_id,))
                    try:
                        command.upgrade(cfg, "head")
                    finally:
                        with conn.cursor() as cursor:
                            cursor.execute("SELECT pg_advisory_unlock(%s);", (lock_id,))
                logger.info("alembic_migrations_applied", extra={"attempt": attempt})
                return
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "alembic_waiting_for_database",
                    extra={"attempt": attempt, "error": str(exc)},
                )
                time.sleep(2)

        raise RuntimeError("Database not ready for migrations after retries") from last_error

    if db_url.startswith("sqlite"):
        from app.core.db.session import init_db

        init_db()
        logger.info("sqlite_init_db_applied")
        return

    command.upgrade(cfg, "head")


if __name__ == "__main__":
    run_migrations()
