from __future__ import annotations

import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, pool

from alembic import context

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.core.config import get_settings
from app.core.models.payment import Base

config = context.config

if config.config_file_name is not None:
    # Keep existing application/uvicorn loggers when Alembic initializes logging.
    fileConfig(config.config_file_name, disable_existing_loggers=False)

settings = get_settings()
target_metadata = Base.metadata


def _db_url() -> str:
    return settings.resolved_database_url


def _include_object(object_, name, type_, reflected, compare_to):  # noqa: ANN001
    # Alembic internal table must be managed only by Alembic runtime, not by autogenerate.
    if type_ == "table" and name == "alembic_version":
        return False
    return True



def run_migrations_offline() -> None:
    db_url = _db_url()
    is_sqlite = db_url.startswith("sqlite")
    context.configure(
        url=db_url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        compare_server_default=True,
        include_schemas=not is_sqlite,
        dialect_opts={"paramstyle": "named"},
        version_table_schema=None if is_sqlite else "public",
        include_object=_include_object,
    )

    with context.begin_transaction():
        if not is_sqlite:
            context.execute('CREATE SCHEMA IF NOT EXISTS "seranking"')
        context.run_migrations()


def run_migrations_online() -> None:
    cfg = config.get_section(config.config_ini_section) or {}
    cfg["sqlalchemy.url"] = _db_url()

    connectable = engine_from_config(
        cfg,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        is_sqlite = connection.dialect.name == "sqlite"
        if not is_sqlite:
            connection.exec_driver_sql('CREATE SCHEMA IF NOT EXISTS "seranking"')
            connection.commit()
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            include_schemas=not is_sqlite,
            render_as_batch=is_sqlite,
            version_table_schema=None if is_sqlite else "public",
            include_object=_include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
