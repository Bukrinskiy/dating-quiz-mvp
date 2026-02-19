# AGENTS.md

## Project Purpose & Scope
`dating-quiz-mvp` — продуктовый MVP квиза знакомств с веб-воронкой и backend API для платежного редиректа.

Границы текущего scope:
- Frontend SPA (`React 19 + TypeScript + Vite 7`) и legacy статические артефакты в корне репозитория.
- Backend API (`FastAPI`, Python 3.12, запуск через `uv`).
- Контейнеризация и окружения через `docker compose` и `Makefile`.

Вне текущего scope:
- Полноценная платежная интеграция (сейчас `/api/payment/redirect` возвращает `503`).

## System Map (frontend/backend/compose/deploy)
- `frontend/`: SPA, сборка Vite, раздача через Nginx, runtime env injection через `runtime-config.js`.
- `backend/`: FastAPI API (`/health`, `/api/payment/redirect`).
- `docker-compose*.yml`: runtime профили (prod-like/test/dev).
- `Makefile`: единая точка управления локальным запуском, тестами, сборкой и деплоем.
- `deploy`: `make deploy` публикует образы и перезапускает удаленный хост `clario-landing`.

Детали: [02-architecture](docs/02-architecture.md), [06-deployment-and-environments](docs/06-deployment-and-environments.md).

## Quick Start (локально и через docker)
Через Docker (prod-like):
1. `cp .env.template .env`
2. `make up`
3. Проверка: `http://localhost:8080/`, `http://localhost:8000/health`

Dev-режим (backend в Docker + frontend локально):
1. `make dev-up`
2. `make dev-frontend`
3. Проверка: `http://localhost:5173/`

Детали: [01-project-overview](docs/01-project-overview.md), [06-deployment-and-environments](docs/06-deployment-and-environments.md).

## Engineering Workflow (ветки, коммиты, PR, проверки)
- Ветки: от `main`, короткие feature/fix ветки.
- Коммиты: атомарные, с явным scope (`frontend`, `backend`, `infra`, `docs`).
- PR: обязательны описание изменений, рисков, план тестов и откат.
- Минимальные проверки перед PR:
  - `make test-backend`
  - smoke frontend маршрутов `/`, `/block-1..7`, `/pay`, `/terms.html`, `/privacy-policy.html`, `/refund-policy.html`
  - проверка docker-подъема (`make up`/`make down`)

Детали: [04-development-workflow](docs/04-development-workflow.md), [05-testing-strategy](docs/05-testing-strategy.md).

## Definition of Done
Изменение считается завершенным, если:
1. Функционал реализован и поведение подтверждено тестами/smoke.
2. Нет регрессий в ключевых маршрутах и API.
3. Конфигурация окружений и переменные описаны/обновлены в docs.
4. Обновлена документация в `docs/*` и при необходимости ссылки в `README.md`.
5. Риски и `TBD` зафиксированы с планом верификации.

Детали: [05-testing-strategy](docs/05-testing-strategy.md), [11-troubleshooting](docs/11-troubleshooting.md), [12-glossary-and-decisions](docs/12-glossary-and-decisions.md).

## Security & Secrets Policy
- Не коммитить реальные секреты в репозиторий.
- Использовать только `.env.template` как источник формата переменных.
- В документации приводить только безопасные примеры значений.
- Для access-данных (docker login/token, merchant secrets) использовать защищенный storage CI/CD или секрет-хранилище окружения.

Детали: [07-security-and-compliance](docs/07-security-and-compliance.md).

## Docs Index
- [01 Project Overview](docs/01-project-overview.md)
- [02 Architecture](docs/02-architecture.md)
- [03 Repository Structure](docs/03-repository-structure.md)
- [04 Development Workflow](docs/04-development-workflow.md)
- [05 Testing Strategy](docs/05-testing-strategy.md)
- [06 Deployment and Environments](docs/06-deployment-and-environments.md)
- [07 Security and Compliance](docs/07-security-and-compliance.md)
- [08 Observability and Operations](docs/08-observability-and-operations.md)
- [09 API and Integrations](docs/09-api-and-integrations.md)
- [10 Frontend Journeys and Routing](docs/10-frontend-journeys-and-routing.md)
- [11 Troubleshooting](docs/11-troubleshooting.md)
- [12 Glossary and Decisions](docs/12-glossary-and-decisions.md)
- [README](README.md)

## Ownership & Change Policy
- Владельцы документации: команда разработки (frontend/backend/infra) с ответственностью автора изменения.
- Любой PR, меняющий поведение системы, обязан обновить релевантные `docs/*.md`.
- `AGENTS.md` изменяется только как индекс/политика; технические детали хранятся в `docs/*`.
- `TBD` должны иметь явный критерий закрытия (что проверить, где, кем).
