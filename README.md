# Dating Quiz MVP (React + FastAPI + Docker Compose)

Минимальный стек проекта:
- `frontend`: React + TypeScript + Vite (в Docker сборка через `pnpm`, раздача через Nginx)
- `backend`: FastAPI (зависимости и запуск через `uv`)
- `docker-compose`: поднимает оба сервиса

## Быстрый старт

1. Создайте файл окружения:

```bash
cp .env.template .env
```

2. Заполните значения в `.env` (`FK_MERCHANT_ID`, `FK_SECRET_1`, и т.д.).

3. Запустите проект:

```bash
make up
```

4. Откройте приложение:
- `http://localhost/`

Остановка:

```bash
make down
```

## Dev-режим: backend в Docker, frontend локально

1. Поднять backend в dev-контейнере:

```bash
make dev-up
```

2. Запустить frontend локально (в отдельном терминале):

```bash
make dev-frontend
```

Открыть:
- `http://localhost:5173/` — frontend (Vite HMR, локальный процесс)
- `http://localhost:8000/health` — backend (uvicorn --reload в Docker)

Остановка backend dev-контейнера:

```bash
make dev-down
```

Логи backend dev:

```bash
make dev-logs
make dev-logs-backend
```

В этом режиме:
- frontend работает локально и обновляется через Vite HMR;
- backend работает в Docker и перезапускается через `--reload`;
- `/api/*` на frontend проксируется в backend сервис.

## Оплата

Frontend отправляет пользователя на:
- `/api/payment/redirect?clickid=<id>`

Backend:
- валидирует и санитизирует `clickid`
- считает подпись Free-Kassa
- возвращает `302` redirect на `https://pay.fk.money/...`

## Полезные команды

```bash
make help
make build
make logs
make test-backend
```

Локально backend через `uv`:

```bash
cd backend
uv sync --dev
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Локально frontend через `pnpm`:

```bash
cd frontend
corepack enable
pnpm install
pnpm dev
```

## Структура

- `/Users/tema/my/dating-quiz-mvp/frontend` — React SPA
- `/Users/tema/my/dating-quiz-mvp/backend` — FastAPI
- `/Users/tema/my/dating-quiz-mvp/docker-compose.yml`
