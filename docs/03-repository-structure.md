# 03. Repository Structure

## Верхний уровень
- `frontend-site/` — новый брендовый site surface для `flirto.guru`, отдельный build/runtime unit на FSD-структуре.
- `frontend_old/` — legacy SPA клиент, временно сохраняемый как reference surface до cutover.
- `frontend-landing/` — новый landing surface для `lp*.flirto.guru`, реализованный как отдельный FSD codebase.
- `frontend-pay/` — новый payment surface для `pay.flirto.guru`, реализованный как отдельный pay-only codebase.
- `frontend-app/` — новый PWA surface для `app.flirto.guru` с email auth и advice workspace.
- `backend/` — FastAPI backend.
- `bot/` — aiogram Telegram-бот (отдельный сервис).
- `docker-compose.yml` — prod-like запуск из готовых image.
- `docker-compose.test.yml` — локальная сборка и запуск обоих сервисов.
- `docker-compose.dev.yml` — dev-контур (backend + frontend + bot).
- `Makefile` — унифицированные команды запуска/тестов/деплоя.
- `.env.template` — шаблон переменных окружения.
- `README.md` — базовый quick-start.

## Frontend Site
- `frontend-site/src/app/*` — bootstrap, router и global styles brand-site shell.
- `frontend-site/src/pages/*` — страницы `home`, `legal`, `not-found`.
- `frontend-site/src/widgets/*` — `site-header`, `site-footer`, `legal-layout`, `hero-cta`.
- `frontend-site/src/shared/*` — runtime config, routes, i18n content и UI primitives без зависимости от верхних FSD-слоев.
- `frontend-site/Dockerfile` / `frontend-site/nginx.conf` / `frontend-site/runtime-config.js.template` — отдельные container/runtime артефакты нового surface c runtime contract `API_BASE_URL`, `APP_PUBLIC_BASE_URL`, `PRIMARY_LANDING_URL`.

## Legacy Frontend
- `frontend_old/src/app/App.tsx` — основной роутинг legacy SPA.
- `frontend_old/src/pages/*` — текущие страницы legacy воронки (`NewQuiz`, `QuizEmail`, `QuizCheckout`, `PaySuccess`, `PayCancel`, `PayManage`, `Legal`).
- `frontend_old/src/shared/config/tracking.ts` — чтение `window.__APP_CONFIG__` + `import.meta.env`.
- `frontend_old/index.html` — bootstrap скриптов, пикселей и runtime-конфига.
- `frontend_old/runtime-config.js.template` — шаблон runtime переменных.
- `frontend_old/docker-entrypoint/40-runtime-config.sh` — генерация `/runtime-config.js`.
- `frontend_old/nginx.conf` — SPA fallback + `/api` proxy.

## Frontend Landing
- `frontend-landing/src/app/App.tsx` — host-aware router нового landing surface.
- `frontend-landing/src/entities/landing-manifest/*` — static manifest model и host resolver.
- `frontend-landing/src/entities/quiz-session/*` — browser-facing session API, привязанный к `API_BASE_URL`.
- `frontend-landing/src/features/handoff-to-pay/*` — redirect contract из landing в `pay`.
- `frontend-landing/runtime-config.js.template` — runtime contract `APP_SURFACE`, `API_BASE_URL`, `PAY_PUBLIC_BASE_URL`.
- `frontend-landing/Dockerfile` / `frontend-landing/nginx.conf` — отдельная сборка и SPA shell без same-origin `/api` proxy.

## Frontend Pay
- `frontend-pay/src/app/*` — bootstrap и router отдельного pay shell.
- `frontend-pay/src/pages/*` — route-level composition для `checkout`, `success`, `cancel`, `manage`, `not-found`.
- `frontend-pay/src/shared/api/*` — browser-facing payment/session API, привязанный к `API_BASE_URL`.
- `frontend-pay/src/shared/config/*` — runtime config и canonical pay routes.
- `frontend-pay/runtime-config.js.template` — runtime contract `APP_SURFACE`, `API_BASE_URL`, `PAY_PUBLIC_BASE_URL`.
- `frontend-pay/Dockerfile` / `frontend-pay/nginx.conf` — отдельная сборка payment surface без reuse legacy build context.

## Frontend App
- `frontend-app/src/app/App.tsx` — router, auth bootstrap, paywall и advice workspace.
- `frontend-app/src/shared/runtime.ts` — runtime config для `APP_SURFACE`, `API_BASE_URL`, `PAY_PUBLIC_BASE_URL`, `APP_PUBLIC_BASE_URL`, `LANDING_PUBLIC_BASE_URL`.
- `frontend-app/src/styles/app.css` — мобильный PWA shell и layout tokens.
- `frontend-app/runtime-config.js.template` — runtime contract для `app.flirto.guru`.
- `frontend-app/Dockerfile` / `frontend-app/nginx.conf` — отдельная сборка и SPA shell PWA surface.

## Backend
- `backend/app/main.py` — FastAPI приложение с payment + bot internal API.
- `backend/tests/test_payment_redirect.py` — backend unit/integration-like тесты.
- `backend/pyproject.toml` / `backend/uv.lock` — зависимости и lock для `uv`.

## Bot
- `bot/app/main.py` — entrypoint, переключение `polling|webhook`.
- `bot/app/handlers/*` — `/start`, `/restore`, `/premium`.
- `bot/app/middlewares/access_gate.py` — gate для платного доступа.
- `bot/app/client/backend_api.py` — HTTP клиент к FastAPI.

## Публичные frontend маршруты
- Канонические маршруты:
  - `/en/quiz/:step`
  - `/en/quiz/email/:uuid`
  - `/en/checkout/:uuid`
  - `/en/pay/success|cancel|manage`
  - `/en/terms.html`, `/en/privacy-policy.html`, `/en/refund-policy.html`
- Compatibility маршруты:
  - `/:lang/...` сохраняются только как redirect на эквивалентный `/en/...`

## Зоны потенциальной путаницы
- Наличие `frontend_old/dist` в рабочем дереве может приводить к ошибочным diff/ревью артефактов сборки.

См. также: [10-frontend-journeys-and-routing](./10-frontend-journeys-and-routing.md), [12-glossary-and-decisions](./12-glossary-and-decisions.md).
