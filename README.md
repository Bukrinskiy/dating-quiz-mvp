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

1. Frontend вызывает `POST /api/payment/checkout-session`.
2. Backend создает Stripe Checkout Session (`one_time` или `subscription`).
3. Stripe шлет webhook в `POST /api/stripe/webhook`.
4. Backend подтверждает оплату, создает activation token и обновляет `orders` в PostgreSQL.
5. Email отключен в MVP: вместо отправки backend пишет `email_delivery_skipped` в лог.
6. Telegram restore: `/restore` -> `POST /api/auth/restore/request|confirm`.

## API

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
