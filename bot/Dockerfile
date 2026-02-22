FROM python:3.13-slim

WORKDIR /app

ENV UV_PROJECT_ENVIRONMENT=/app/.venv
ENV UV_LINK_MODE=copy
ENV PATH="/app/.venv/bin:$PATH"

RUN pip install --no-cache-dir uv

COPY bot/pyproject.toml /app/pyproject.toml
RUN uv sync --no-dev

COPY bot/app /app/app

CMD ["uv", "run", "--no-sync", "python", "-m", "app.main"]
