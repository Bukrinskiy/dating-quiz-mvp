# 01. Project Overview

## Назначение
Проект реализует маркетинговую квиз-воронку знакомств с последовательными блоками вопросов и финальным экраном оплаты.

Текущее состояние:
- Frontend открывает первый экран квиза на `/`, канонический язык публичных URL — `en`; маршруты `/:lang` сохранены только как compatibility redirect на `/en/...`, а остальные шаги ведет по `/en/quiz/*`; legal страницы доступны на `/en/*.html`.
- Backend предоставляет API тарифов, checkout-сессий Stripe, webhook-процессинг и восстановление доступа.
- На `/:lang/quiz/checkout/:uuid` поддерживаются промокоды через query `?promo=...`; цены валидируются и применяются server-side.

См. также: [02-architecture](./02-architecture.md), [09-api-and-integrations](./09-api-and-integrations.md).

## Технологический стек
- Frontend: legacy `frontend_old`, новый `frontend-site` и новый `frontend-landing` на React 19, TypeScript, Vite 7, pnpm, Nginx (runtime).
- Backend: FastAPI, Python 3.12, uv, uvicorn.
- Orchestration: `docker-compose.yml`, `docker-compose.dev.yml`, `docker-compose.test.yml`, `Makefile`.

## Ключевые сценарии использования
- Пользователь проходит шаги квиза (`/en/quiz/1..26`).
- Переходит в `/en/quiz/email/:uuid` и затем `/en/quiz/checkout/:uuid`, выбирает тариф и при необходимости применяет промокод.
- Может открыть юридические страницы `/en/terms.html`, `/en/privacy-policy.html`, `/en/refund-policy.html`.

## Key Commands
| Команда | Назначение |
|---|---|
| `make help` | Список доступных целей Makefile |
| `make up` | Поднять frontend + backend (prod-like compose) |
| `make down` | Остановить сервисы |
| `make test-backend` | Запустить backend-тесты в контейнере |
| `make test-backend-local` | Запустить backend-тесты локально через `uv` |
| `make dev-up` | Поднять backend в dev-режиме (`--reload`) |
| `make dev-frontend` | Запустить frontend через Vite HMR на `5173` |
| `make deploy` | Пуш образов и remote restart на `clario-landing` |

## Ограничения MVP
- Нет отдельного админ-интерфейса для промокодов (создание/активация — через SQL/миграции).
- Нет формализованных CI/CD quality gates в репозитории (зафиксировано как `TBD`).

## Связанные документы
- [04-development-workflow](./04-development-workflow.md)
- [05-testing-strategy](./05-testing-strategy.md)
- [06-deployment-and-environments](./06-deployment-and-environments.md)
