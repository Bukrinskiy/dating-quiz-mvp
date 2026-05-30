# Dating Quiz MVP (React + FastAPI + Docker Compose)

Минимальный стек проекта:
- `frontend_old`: legacy React + TypeScript + Vite SPA
- `frontend-site`: новый React + TypeScript + Vite surface для `flirto.guru`
- `frontend-landing`: новый React + TypeScript + Vite surface для `lp*.flirto.guru` с quiz/email-only flow
- `frontend-pay`: новый React + TypeScript + Vite surface для `pay.flirto.guru`
- `frontend-app`: новый React + TypeScript + Vite PWA surface для `app.flirto.guru`
- `backend`: FastAPI + Stripe + PostgreSQL
- `bot`: aiogram (Telegram), отдельный контейнер
- target production topology: `frontend-site` + `frontend-landing` + `frontend-pay` + `frontend-app` + `backend` + `bot` + `postgres`
- production host routing и TLS: внешний Apache, не compose-managed proxy

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
- `http://localhost:8080/` (редиректит на `/ru/quiz/1`)
- `http://localhost:8080/ru/quiz/1`
- `http://localhost:8000/health`

## Payment MVP flow

1. Основной funnel: `/:lang/quiz/:step` -> result CTA -> `POST /api/session/create` -> `/:lang/quiz/email/:uuid` -> `/:lang/quiz/checkout/:uuid`.
2. `/:lang/quiz/checkout/:uuid` загружает планы через `POST /api/session/get-plan-data` и создает Stripe intent через `POST /api/session/create-payment-intent`.
3. Backend использует текущую Stripe-логику (`/api/payment/intent`) под капотом, но через uuid-сессию.
4. Stripe шлет webhook в `POST /api/stripe/webhook`.
5. Backend подтверждает оплату, создает activation token и обновляет `orders` в PostgreSQL.
6. Telegram restore: `/restore` -> `POST /api/auth/restore/request|confirm`.

## API

- `GET /api/payment/plans`
- `POST /api/payment/checkout-session`
- `POST /api/payment/intent`
- `POST /api/stripe/webhook`
- `GET /api/payment/session-status?session_id=...`
- `GET /api/payment/order-status?order_id=...`
- `POST /api/payment/customer-portal`
- `POST /api/session/get-currency2`
- `POST /api/session/create`
- `POST /api/session/update-email`
- `POST /api/session/get-plan-data`
- `POST /api/session/create-payment-intent`
- `POST /api/access/activate`
- `POST /api/auth/restore/request`
- `POST /api/auth/restore/confirm`
- `POST /api/app/access-code/redeem`
- `POST /api/bot/access/status` (internal)
- `POST /api/bot/access/activate` (internal)
- `POST /api/bot/restore/request` (internal)
- `POST /api/bot/restore/confirm` (internal)
- `POST /api/bot/admin/access-code/create` (internal)
- `GET /api/payment/redirect` -> `410` (legacy)

## Payment pricing config

- Pricing and merchandising for `/:lang/quiz/checkout/:uuid` are controlled by backend env vars, not frontend hardcoded values.
- Subscription catalog includes `sub_weekly`, `sub_monthly`, `sub_quarterly`.
- For each subscription plan, `.env` can configure amount, currency, billing interval, interval count, product name, headline, badge, compare-at price, per-day price, visual highlighting, and sort order.
- Exactly one subscription plan must have `*_IS_DEFAULT=true`.

## Тесты

```bash
make test-backend
```

## SMTP test email

Для быстрой проверки SMTP можно отправить тестовое письмо через backend CLI.
Скрипт берет `SMTP_HOST`, `SMTP_PORT`, `SMTP_USE_TLS`, `SMTP_LOGIN`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL` из `.env`.

```bash
cd backend
uv run python -m app.cli.send_test_email you@example.com
```

Опционально можно передать тему и текст:

```bash
cd backend
uv run python -m app.cli.send_test_email you@example.com --subject "SMTP smoke" --message "Manual SMTP check"
```

## Dev-режим

```bash
make dev-up
```

- legacy frontend: `http://localhost:5173/`
- frontend-site: `http://localhost:5175/`
- frontend-landing: `http://localhost:5174/`
- frontend-pay: target dev URL `http://localhost:5176/`
- frontend-app: `http://localhost:5177/`
- backend: `http://localhost:8000/health`
- bot: polling mode (без внешнего порта в dev)

Новые browser-facing surfaces используют explicit `API_BASE_URL`; target production browser API origin — `https://api.flirto.guru`.

Только новый landing surface локально:

```bash
make dev-frontend-landing
```

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
