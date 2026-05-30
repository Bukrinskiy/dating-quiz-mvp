# 06. Deployment and Environments

## Compose services
- `postgres` (`postgres:17-alpine`)
- `backend` (FastAPI + Stripe)
- `bot` (aiogram Telegram service)
- `frontend-site` (brand-site surface for `flirto.guru`)
- `frontend-landing` (quiz landing surface for `lp*.flirto.guru`)
- `frontend-pay` (payment surface for `pay.flirto.guru`)
- `frontend-app` (PWA surface for `app.flirto.guru`)
- `frontend_old` / `frontend` (legacy transitional surface, не часть target topology)

## Core env
- `DATABASE_URL`
- `SITE_PUBLIC_BASE_URL`
- `PAY_PUBLIC_BASE_URL`
- `APP_APP_PUBLIC_BASE_URL`
- `APP_LANDING_PUBLIC_BASE_URL`
- `API_PUBLIC_BASE_URL`
- `BACKEND_CORS_ALLOW_ORIGINS`
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
- `SMTP_LOGIN` (`support@flirto.guru`)
- `SMTP_PASSWORD` (Gmail app password)
- `SMTP_FROM_EMAIL`
- `BOT_MODE` (`polling|webhook`)
- `BOT_PORT`
- `BOT_INTERNAL_TOKEN`
- `BOT_BACKEND_BASE_URL`
- `BOT_WEBHOOK_PATH_SECRET`
- `APP_PUBLIC_BASE_URL`
- `BOT_PAY_URL`
- `BOT_ALLOWED_PUBLIC_COMMANDS`
- `EMAIL_DELIVERY_MODE=log_only`
- `LOG_OTP_IN_NONPROD=true`
- `SITE_APP_PUBLIC_BASE_URL`

## Pricing env (backend authority)
- `PAY_ONE_TIME_BASIC_AMOUNT_MINOR`
- `PAY_ONE_TIME_BASIC_CURRENCY`
- `PAY_SUB_MONTHLY_BASE_AMOUNT_MINOR`
- `PAY_SUB_MONTHLY_DISCOUNT_PERCENT`
- `PAY_SUB_MONTHLY_BASE_PER_DAY_AMOUNT_MINOR`
- `PAY_SUB_MONTHLY_CURRENCY`
- `PAY_SUB_MONTHLY_INTERVAL`

## Runtime notes
- Backend применяет Alembic миграции на старте (`run_migrations`).
- Browser-facing backend origin для новых surfaces: `API_PUBLIC_BASE_URL` (`api.flirto.guru` в target topology).
- Payment success/cancel/manage URLs backend генерирует только от `PAY_PUBLIC_BASE_URL`.
- CORS allowlist задается через `BACKEND_CORS_ALLOW_ORIGINS` как comma-separated список origins без wildcard.
- Email отправка выполняется по SMTP (Gmail STARTTLS).
- Для smoke-проверки SMTP локально можно выполнить `cd backend && uv run python -m app.cli.send_test_email you@example.com`.
- Новые frontend runtime-конфиги (`/runtime-config.js`) генерируются из env на старте соответствующих контейнеров.
- Для `frontend-landing` локальный Vite dev-server тоже отдает `/runtime-config.js` из корневого env, чтобы dev повторял runtime contract production.
- Target production topology состоит из `frontend-site`, `frontend-landing`, `frontend-pay`, `frontend-app`, `backend`, `bot`, `postgres`.
- Внешний Apache является source of truth для production host routing и TLS; compose поднимает только app containers.
- Legacy single `frontend` container сохраняется только как transitional runtime до cutover.
- В `docker-compose.dev.yml` target dev topology поднимает `frontend-site` на `http://localhost:5175`, `frontend-landing` на `http://localhost:5174`, `frontend-pay` на `http://localhost:5176` и `frontend-app` на `http://localhost:5177`.
- Для Яндекс.Метрики используется `VITE_YANDEX_METRIKA_ID` (пустое значение отключает счётчик).
- Prod webhook для Telegram: Apache reverse proxy
  - `https://<domain>/tg/webhook/<secret>` -> `http://bot:8081/webhook/<secret>`
- Bot health endpoint: `GET /health` на `BOT_PORT` (polling и webhook режимы).

## Target production host mapping
| Public host | Target service | Notes |
|---|---|---|
| `flirto.guru` | `frontend-site` | brand/legal/trust pages |
| `lp*.flirto.guru` | `frontend-landing` | один runtime для всех landing hosts |
| `pay.flirto.guru` | `frontend-pay` | checkout, success, cancel, manage |
| `app.flirto.guru` | `frontend-app` | email-auth PWA и advice workspace |
| `api.flirto.guru` | `backend` | единый browser-facing API origin |

## Service env matrix
### Backend
- `SITE_PUBLIC_BASE_URL`
- `PAY_PUBLIC_BASE_URL`
- `API_PUBLIC_BASE_URL`
- `BACKEND_CORS_ALLOW_ORIGINS`
- Stripe env (`STRIPE_*`)
- Bot/payment integration env (`BOT_INTERNAL_TOKEN`, `BOT_ALLOWED_PUBLIC_COMMANDS`)

### Frontend site
- `API_BASE_URL`
- `APP_PUBLIC_BASE_URL`
- `PRIMARY_LANDING_URL`

### Frontend landing
- `APP_SURFACE`
- `API_BASE_URL`
- `PAY_PUBLIC_BASE_URL`
- `VITE_MOBI_SLON_URL` (`lp1` production: `https://whitetrack.xyz/index.php`)
- `VITE_MOBI_SLON_CAMPAIGN_KEY_FACEBOOK` (`lp1` production Facebook pixel campaign key)
- `VITE_MOBI_SLON_CAMPAIGN_KEY_GOOGLE` (`lp1` production Google Binom pixel campaign key; `frontend-landing` uses it when URL query contains `source=ga`, case-insensitive)
- `VITE_GOOGLE_ADS_ID` (Google Ads global tag ID injected by `frontend-landing` HTML shell)
- `VITE_FB_PIXEL_ID` (Meta Pixel ID for landing browser script and `noscript` image)
- `VITE_YANDEX_METRIKA_ID`
- `VITE_TRACKING_DEBUG`

### Frontend pay
- `APP_SURFACE`
- `API_BASE_URL`
- `PAY_PUBLIC_BASE_URL`
- `VITE_YANDEX_METRIKA_ID`
- `VITE_TRACKING_DEBUG`

### Frontend app
- `APP_SURFACE`
- `API_BASE_URL`
- `PAY_PUBLIC_BASE_URL`
- `APP_PUBLIC_BASE_URL`
- `LANDING_PUBLIC_BASE_URL`

### Bot
- `BOT_BACKEND_BASE_URL`
- `APP_PUBLIC_BASE_URL`
- `BOT_PAY_URL`
- `BOT_MODE`
- `BOT_PORT`
- `BOT_WEBHOOK_PATH_SECRET`

### Backend tracking
- `META_PIXEL_ID`
- `META_ACCESS_TOKEN`
- `META_GRAPH_API_VERSION`

## Prod env source of truth
- В текущем deploy-процессе `docker compose` читает `.env` на сервере.
- `.env.prod` в репозитории является эталоном значений и должен быть синхронизирован в серверный `.env` перед `make deploy` (или эквивалентным шагом на сервере).
- Если compose запускается без `--env-file`, изменения только в `.env.prod` не применяются.
- `make push-frontend-landing-image` читает `VITE_FB_PIXEL_ID` из локального `.env` при сборке образа, а runtime контейнера `frontend-landing` затем подставляет тот же env в `/runtime-config.js` и итоговый `/index.html`.
- Target production compose должен публиковать loopback-only порты:
  - `SITE_PORT` -> `frontend-site`
  - `LANDING_PORT` -> `frontend-landing`
  - `PAY_PORT` -> `frontend-pay`
  - `APP_PORT` -> `frontend-app`
  - `BACKEND_PORT` -> `backend`
  - `BOT_PORT` -> `bot`
- Apache должен проксировать публичные host names в эти loopback ports; прямой internet exposure контейнеров не является source of truth.

## Meta Pixel / CAPI prod rollout
- Обязательные env:
  - `VITE_FB_PIXEL_ID=1246315427580945`
  - `META_PIXEL_ID=1246315427580945`
  - `META_ACCESS_TOKEN=<актуальный Meta CAPI token>`
- Где обновлять значения:
  - `.env.prod` в репозитории как эталон
  - серверный `/opt/flirto-guru/.env`, который реально читает production `docker compose`
  - локальный `.env` перед запуском `make deploy`, если деплой делается с локальной машины
- Какие сервисы должны подхватить изменения:
  - `frontend-landing` для browser pixel и `noscript`
  - `backend` для Meta Conversions API relay
- Порядок rollout:
  1. Обновить `VITE_FB_PIXEL_ID`, `META_PIXEL_ID`, `META_ACCESS_TOKEN` в `.env.prod`.
  2. Синхронизировать те же значения в серверный `.env`.
  3. Перед локальным `make deploy` проверить, что локальный `.env` содержит актуальный `VITE_FB_PIXEL_ID`.
  4. Выполнить `make deploy`.
  5. Убедиться, что удаленный `docker compose up -d --force-recreate` перезапустил `frontend-landing` и `backend`.
- Post-deploy smoke-check:
  - Проверить `window.__APP_CONFIG__.VITE_FB_PIXEL_ID === "1246315427580945"`.
  - Проверить, что landing инициализирует `fbq('init', '1246315427580945')`.
  - Проверить `noscript` URL: `https://www.facebook.com/tr?id=1246315427580945&ev=PageView&noscript=1`.
  - Пройти `/:lang/quiz/1`, `/:lang/quiz/15`, `/:lang/quiz/26`, `/:lang/quiz/email/:uuid`, `/:lang/terms.html` и убедиться, что route-change `PageView` продолжает отправляться.
  - Проверить `/api/tracking/meta-event` в среде с production env.

## Yandex Metrika prod smoke-check
- После деплоя открыть сайт и проверить в DevTools:
  - `window.__APP_CONFIG__.VITE_YANDEX_METRIKA_ID` содержит ожидаемый ID.
  - `window.ym` определен.
- Пройти ключевые маршруты новых surfaces в target topology:
  - `site`: `http://localhost:5175/en`
  - `landing`: `http://localhost:5174/ru/quiz/15`, `http://localhost:5174/ru/quiz/26`, `http://localhost:5174/ru/quiz/email/:uuid`
  - `pay`: `http://localhost:5176/ru/checkout/:uuid`, `http://localhost:5176/ru/pay/success`, `http://localhost:5176/ru/pay/manage`
  - `app`: `http://localhost:5177/login`, `http://localhost:5177/paywall`, `http://localhost:5177/app`
- Проверить preflight/browser calls из `site`, `landing` и `pay` в `API_PUBLIC_BASE_URL`.

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
