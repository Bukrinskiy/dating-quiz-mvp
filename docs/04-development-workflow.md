# 04. Development Workflow

## Branching
Рекомендуемая схема:
1. Базовая ветка: `main`.
2. Рабочие ветки: `feature/<short-name>` или `fix/<short-name>`.
3. Ветка должна покрывать один логический change-set.

## Commit Policy
- Атомарные коммиты.
- Формат сообщения: `<scope>: <summary>`.
- Допустимые scope: `frontend`, `backend`, `infra`, `docs`, `ci`.

Примеры:
- `frontend: fix legal links clickid propagation`
- `backend: sanitize clickid before payment redirect`
- `docs: add architecture and deployment guides`

## Pull Request Policy
В каждом PR обязательно:
- Что изменено.
- Почему изменено.
- Риски и влияние на маршруты/API.
- План проверки.
- План отката.

## Минимальный PR Checklist
1. Запущены релевантные команды (см. таблицу ниже).
2. Проверены ключевые маршруты и backend endpoints.
3. Обновлены документы `docs/*` при изменении поведения.
4. Нет секретов в диффе.

## Key Commands (workflow)
| Команда | Когда использовать |
|---|---|
| `make help` | Быстро проверить доступные цели |
| `make up` / `make down` | E2E smoke через контейнеры |
| `make logs` | Диагностика runtime |
| `make test-backend` | Базовый quality gate backend |
| `make dev-up` / `make dev-down` | Локальная backend разработка |
| `make dev-frontend` | Frontend HMR разработка |
| `make build` / `make rebuild` | Проверка сборки контейнеров |

## Обновление документации
Любой change, меняющий:
- API-контракты,
- маршруты/URL,
- конфигурацию окружений,
- security-политику,

обязан обновить соответствующие файлы в `docs/` и, при необходимости, ссылки в `AGENTS.md`.

См. также: [05-testing-strategy](./05-testing-strategy.md), [07-security-and-compliance](./07-security-and-compliance.md).
