# 06. Deployment and Environments

## Compose services
- `postgres` (`postgres:17-alpine`)
- `backend` (FastAPI + Stripe)
- `bot` (aiogram Telegram service)
- `frontend` (Nginx + SPA)

## Core env
- `DATABASE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ACCESS_TOKEN_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `EMAIL_DELIVERY_MODE=smtp`
- `SMTP_HOST` (`smtp.gmail.com`)
- `SMTP_PORT` (`587`)
- `SMTP_USE_TLS=true`
- `SMTP_LOGIN` (`support@seranking.store`)
- `SMTP_PASSWORD` (Gmail app password)
- `SMTP_FROM_EMAIL`
- `BOT_MODE` (`polling|webhook`)
- `BOT_PORT`
- `BOT_INTERNAL_TOKEN`
- `BOT_BACKEND_BASE_URL`
- `BOT_WEBHOOK_PATH_SECRET`
- `APP_PUBLIC_BASE_URL`
- `BOT_ALLOWED_PUBLIC_COMMANDS`
- `EMAIL_DELIVERY_MODE=log_only`
- `LOG_OTP_IN_NONPROD=true`

## Pricing env (backend authority)
- `PAY_ONE_TIME_BASIC_AMOUNT_MINOR`
- `PAY_ONE_TIME_BASIC_CURRENCY`
- `PAY_SUB_MONTHLY_AMOUNT_MINOR`
- `PAY_SUB_MONTHLY_CURRENCY`
- `PAY_SUB_MONTHLY_INTERVAL`

## Runtime notes
- Backend применяет Alembic миграции на старте (`run_migrations`).
- Email отправка выполняется по SMTP (Gmail STARTTLS).
- Frontend runtime-конфиг (`/runtime-config.js`) генерируется из env на старте контейнера.
- Для Яндекс.Метрики используется `VITE_YANDEX_METRIKA_ID` (пустое значение отключает счётчик).
- Prod webhook для Telegram: Apache reverse proxy
  - `https://<domain>/tg/webhook/<secret>` -> `http://bot:8081/webhook/<secret>`
- Bot health endpoint: `GET /health` на `BOT_PORT` (polling и webhook режимы).

## Prod env source of truth
- В текущем deploy-процессе `docker compose` читает `.env` на сервере.
- `.env.prod` в репозитории является эталоном значений и должен быть синхронизирован в серверный `.env` перед `make deploy` (или эквивалентным шагом на сервере).
- Если compose запускается без `--env-file`, изменения только в `.env.prod` не применяются.

## Yandex Metrika prod smoke-check
- После деплоя открыть сайт и проверить в DevTools:
  - `window.__APP_CONFIG__.VITE_YANDEX_METRIKA_ID` содержит ожидаемый ID.
  - `window.ym` определен.
- Пройти ключевые SPA-маршруты (`/`, `/block-1..7`, `/pay`, `/terms.html`, `/privacy-policy.html`, `/refund-policy.html`) и убедиться, что отправляются route-change `hit`.

## Apache webhook example
Пример для виртуального хоста Apache:

```apache
ProxyPreserveHost On
RequestHeader set X-Forwarded-Proto "https"

# Замените secret в обоих путях на BOT_WEBHOOK_PATH_SECRET
<Location "/tg/webhook/replace_me_with_secret">
    <LimitExcept POST>
        Require all denied
    </LimitExcept>
    ProxyPass "http://127.0.0.1:8081/webhook/replace_me_with_secret"
    ProxyPassReverse "http://127.0.0.1:8081/webhook/replace_me_with_secret"
</Location>
```

Если проксируете без localhost, используйте адрес/alias контейнера `bot` в сети docker.
