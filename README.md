# Dating Quiz MVP (React + FastAPI + Docker Compose)

Минимальный стек проекта:
- `frontend`: React + TypeScript + Vite
- `backend`: FastAPI + Stripe + PostgreSQL
- `bot`: aiogram (Telegram), отдельный контейнер
- `docker-compose`: frontend + backend + bot + postgres

## Быстрый старт

1. Создайте окружение:

```bash
cp .env.template .env
```

2. Заполните в `.env` минимум:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ACCESS_TOKEN_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `BOT_INTERNAL_TOKEN`
- `SMTP_PASSWORD` (Gmail app password)
- `DATABASE_URL` (по умолчанию postgres service в compose)

3. Запустите проект:

```bash
make up
```

4. Проверка:
- `http://localhost:8080/`
- `http://localhost:8000/health`

## Payment MVP flow

1. Frontend открывает `/pay`, загружает каталог тарифов через `GET /api/payment/plans`.
2. Пользователь выбирает weekly/monthly/quarterly plan, вводит email и frontend вызывает `POST /api/payment/checkout-session`.
3. Backend создает Stripe Checkout Session (`one_time` или `subscription`) с backend-driven pricing.
4. Stripe шлет webhook в `POST /api/stripe/webhook`.
5. Backend подтверждает оплату, создает activation token и обновляет `orders` в PostgreSQL.
6. Email отключен в MVP: вместо отправки backend пишет `email_delivery_skipped` в лог.
7. Telegram restore: `/restore` -> `POST /api/auth/restore/request|confirm`.

## API

- `GET /api/payment/plans`
- `POST /api/payment/checkout-session`
- `POST /api/stripe/webhook`
- `GET /api/payment/session-status?session_id=...`
- `POST /api/payment/customer-portal`
- `POST /api/access/activate`
- `POST /api/auth/restore/request`
- `POST /api/auth/restore/confirm`
- `POST /api/bot/access/status` (internal)
- `POST /api/bot/access/activate` (internal)
- `POST /api/bot/restore/request` (internal)
- `POST /api/bot/restore/confirm` (internal)
- `GET /api/payment/redirect` -> `410` (legacy)

## Payment pricing config

- Pricing and merchandising for `/pay` are controlled by backend env vars, not frontend hardcoded values.
- Subscription catalog includes `sub_weekly`, `sub_monthly`, `sub_quarterly`.
- For each subscription plan, `.env` can configure amount, currency, billing interval, interval count, product name, headline, badge, compare-at price, per-day price, visual highlighting, and sort order.
- Exactly one subscription plan must have `*_IS_DEFAULT=true`.

## Тесты

```bash
make test-backend
```

## Dev-режим

```bash
make dev-up
```

- frontend: `http://localhost:5173/`
- backend: `http://localhost:8000/health`
- bot: polling mode (без внешнего порта в dev)

## Frontend analytics env

- `VITE_YANDEX_METRIKA_ID` — ID счётчика Яндекс.Метрики для SPA.
- Если `VITE_YANDEX_METRIKA_ID` пустой, Метрика не инициализируется.
- Для runtime в контейнере значение берется из `runtime-config.js`, генерируемого на старте Nginx-контейнера.
- В `docker-compose.yml` используется `.env`; файл `.env.prod` не подхватывается автоматически без `--env-file`.

## Telegram bot guided-flow (v1)
Команды:
- `/start` — активация/проверка доступа
- `/restore` — восстановление по email + OTP
- `/advice` — запуск консультации (`write_now`/`analyze_case`)
- `/reset` — закрытие активной guided-сессии
- `/premium` — проверка paid-доступа (MVP заглушка)

Новые internal API:
- `POST /api/bot/session/start`
- `POST /api/bot/session/{session_id}/asset`
- `POST /api/bot/session/{session_id}/batch/close`
- `POST /api/bot/session/{session_id}/confirm-context`
- `POST /api/bot/session/{session_id}/generate`
- `POST /api/bot/session/{session_id}/refine`
- `POST /api/bot/session/{session_id}/reset`
- `POST /api/bot/media/transcribe`

OpenAI/media env (backend):
- `OPENAI_API_BASE`
- `OPENAI_API_KEY`
- `BOT_OPENAI_MODEL_GENERATE`
- `BOT_OPENAI_MODEL_STT`
- `BOT_MEDIA_MAX_BYTES`
- `BOT_OPENAI_TIMEOUT_SECONDS`
- `BOT_OPENAI_RETRIES`
