# 06. Deployment and Environments

## Compose profiles

### `docker-compose.yml`
Назначение: prod-like runtime из уже собранных image.
- Backend image: `${DOCKER_REPO}:backend-${IMAGE_TAG}`
- Frontend image: `${DOCKER_REPO}:frontend-${IMAGE_TAG}`
- `pull_policy: always`
- Порты ограничены на localhost (`127.0.0.1:*`)

### `docker-compose.test.yml`
Назначение: локальная сборка и запуск обеих сервисов из текущего репозитория.
- `build.context: .` для backend/frontend
- `pull_policy: always`
- Порты аналогично `docker-compose.yml`

### `docker-compose.dev.yml`
Назначение: быстрый backend development.
- Только backend сервис
- Команда запуска `uvicorn ... --reload --reload-dir /app/app`
- Volume: `./backend/app:/app/app`
- Порт `8000:8000`

## Frontend runtime model
1. На build-этапе Vite формирует static bundle (`pnpm build`).
2. На runtime Nginx раздает `/usr/share/nginx/html`.
3. Перед стартом Nginx скрипт `40-runtime-config.sh` генерирует `runtime-config.js` с `VITE_*`.
4. Клиент читает конфиг из `window.__APP_CONFIG__`.

## Backend runtime model
- `FastAPI` приложение в `backend/app/main.py`.
- Runtime endpoint-ы:
  - `GET /health`
  - `GET /api/payment/redirect?clickid=...`

## Config / Env Variables
| Переменная | Где используется | Пример безопасного значения | Примечание |
|---|---|---|---|
| `BACKEND_PORT` | compose port mapping | `8000` | Дефолт `8000` |
| `FRONTEND_PORT` | compose port mapping | `8080` | Дефолт `8080` |
| `DOCKER_REPO` | Makefile deploy/push | `acme/dating-quiz` | Имя реестра/репозитория |
| `IMAGE_TAG` | Makefile deploy/push | `staging-2026-02-19` | Тег образов |
| `VITE_MOBI_SLON_URL` | frontend tracking runtime | `https://mobi-slon.com/index.php` | Безопасный публичный URL |
| `VITE_MOBI_SLON_CAMPAIGN_KEY` | frontend tracking runtime | `demo-campaign-key` | Не хранить реальные production ключи в docs |
| `VITE_FB_PIXEL_ID` | frontend tracking runtime | `1234567890` | Публичный идентификатор пикселя |
| `VITE_TRACKING_DEBUG` | frontend tracking runtime | `true` | `true/false` или `1/0` |
| `docker_login` | `make docker-login` | `ci-bot` | Секретные значения только в защищенном хранилище |
| `docker_token` | `make docker-login` | `***` | Никогда не коммитить |
| `FK_MERCHANT_ID` | `.env.template` | `YOUR_MERCHANT_ID` | Сейчас платежи backend-ом не подключены |
| `FK_SECRET_1` | `.env.template` | `***` | Секрет |
| `FK_CURRENCY` | `.env.template` | `USD` | Параметр платежей |
| `FK_PAY_URL` | `.env.template` | `https://pay.fk.money/` | Параметр платежей |
| `FK_AMOUNT` | `.env.template` | `9.99` | Параметр платежей |

## Deploy flow (текущее состояние)
`make deploy`:
1. `make push-images`.
2. `ssh clario-landing 'cd /opt/seranking-app && docker compose up -d'`.

`TBD`: rollout policy, health-check gates и rollback-автоматизация на remote host.

См. также: [02-architecture](./02-architecture.md), [07-security-and-compliance](./07-security-and-compliance.md), [08-observability-and-operations](./08-observability-and-operations.md).
