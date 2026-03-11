# 01. Project Overview

## Назначение
Проект реализует маркетинговую квиз-воронку знакомств с последовательными блоками вопросов и финальным экраном оплаты.

Текущее состояние:
- Frontend ведет пользователя по маршрутам воронки и юридическим страницам.
- Backend предоставляет API тарифов, checkout-сессий Stripe, webhook-процессинг и восстановление доступа.
- На `/pay` поддерживаются промокоды через query `?promo=...` и поле ввода; цены валидируются и применяются server-side.

См. также: [02-architecture](./02-architecture.md), [09-api-and-integrations](./09-api-and-integrations.md).

## Технологический стек
- Frontend: React 19, TypeScript, Vite 7, pnpm, Nginx (runtime).
- Backend: FastAPI, Python 3.12, uv, uvicorn.
- Orchestration: `docker-compose.yml`, `docker-compose.dev.yml`, `docker-compose.test.yml`, `Makefile`.

## Ключевые сценарии использования
- Пользователь проходит шаги квиза (`/`, `/block-1..5`, `/block-6`, `/block-7`).
- Переходит на `/pay`, выбирает тариф и при необходимости применяет промокод.
- Может открыть юридические страницы `/terms.html`, `/privacy-policy.html`, `/refund-policy.html`.

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
- Наблюдается coexistence SPA и legacy статических страниц (см. [03-repository-structure](./03-repository-structure.md)).

## Связанные документы
- [04-development-workflow](./04-development-workflow.md)
- [05-testing-strategy](./05-testing-strategy.md)
- [06-deployment-and-environments](./06-deployment-and-environments.md)
