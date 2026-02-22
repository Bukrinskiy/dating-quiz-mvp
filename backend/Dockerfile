FROM python:3.13-slim

WORKDIR /app

ENV UV_PROJECT_ENVIRONMENT=/app/.venv
ENV UV_LINK_MODE=copy
ENV PATH="/app/.venv/bin:$PATH"

RUN pip install --no-cache-dir uv

COPY backend/pyproject.toml /app/pyproject.toml
COPY backend/uv.lock /app/uv.lock
RUN uv sync --locked --no-dev

COPY backend/app /app/app
COPY backend/alembic.ini /app/alembic.ini
COPY backend/alembic /app/alembic

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
