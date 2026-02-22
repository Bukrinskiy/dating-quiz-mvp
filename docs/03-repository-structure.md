# 03. Repository Structure

## Верхний уровень
- `frontend/` — основной SPA клиент.
- `backend/` — FastAPI backend.
- `bot/` — aiogram Telegram-бот (отдельный сервис).
- `docker-compose.yml` — prod-like запуск из готовых image.
- `docker-compose.test.yml` — локальная сборка и запуск обоих сервисов.
- `docker-compose.dev.yml` — dev-контур (backend + frontend + bot).
- `Makefile` — унифицированные команды запуска/тестов/деплоя.
- `.env.template` — шаблон переменных окружения.
- `README.md` — базовый quick-start.

## Frontend
- `frontend/src/app/App.tsx` — основной роутинг приложения.
- `frontend/src/pages/*` — страницы (`Landing`, `QuizBlock`, `Block6`, `Block7`, `PayRedirect`, `Legal`).
- `frontend/src/shared/config/tracking.ts` — чтение `window.__APP_CONFIG__` + `import.meta.env`.
- `frontend/index.html` — bootstrap скриптов, пикселей и runtime-конфига.
- `frontend/runtime-config.js.template` — шаблон runtime переменных.
- `frontend/docker-entrypoint/40-runtime-config.sh` — генерация `/runtime-config.js`.
- `frontend/nginx.conf` — SPA fallback + `/api` proxy.

## Backend
- `backend/app/main.py` — FastAPI приложение с payment + bot internal API.
- `backend/tests/test_payment_redirect.py` — backend unit/integration-like тесты.
- `backend/pyproject.toml` / `backend/uv.lock` — зависимости и lock для `uv`.

## Bot
- `bot/app/main.py` — entrypoint, переключение `polling|webhook`.
- `bot/app/handlers/*` — `/start`, `/restore`, `/premium`.
- `bot/app/middlewares/access_gate.py` — gate для платного доступа.
- `bot/app/client/backend_api.py` — HTTP клиент к FastAPI.

## Legacy/Static артефакты в корне
- `index.html`, `blocks/*.html`, `assets/*`, `terms.html`, `privacy-policy.html`, `refund-policy.html`.

Статус/роль:
- Эти артефакты представляют legacy статическую версию воронки.
- Текущий основной runtime-путь — SPA в `frontend/`.
- Юридические URL сохранены в SPA как маршруты с теми же путями (`/terms.html`, `/privacy-policy.html`, `/refund-policy.html`) для совместимости ссылок.

## Зоны потенциальной путаницы
- Два набора одноименных юридических страниц: legacy root html и SPA routes.
- Наличие `frontend/dist` в рабочем дереве может приводить к ошибочным diff/ревью артефактов сборки.

См. также: [10-frontend-journeys-and-routing](./10-frontend-journeys-and-routing.md), [12-glossary-and-decisions](./12-glossary-and-decisions.md).
