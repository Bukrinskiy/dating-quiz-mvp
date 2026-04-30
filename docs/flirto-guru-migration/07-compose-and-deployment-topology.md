# 07. Compose And Deployment Topology

## Goal
Описать целевую container topology, `docker compose` раскладку, reverse-proxy routing, DNS/TLS matrix и deployment requirements для новой multi-domain платформы.

## Why
Архитектура surface-ов не заработает без явной операционной схемы. Нужен единый документ, который зафиксирует:

- какие контейнеры существуют
- как они связаны
- как домены маршрутизируются в контейнеры
- какие env переменные являются source of truth

## Scope
- Compose services
- Container roles
- Edge/reverse proxy routing
- DNS/TLS mapping
- Runtime env matrix

## Out of Scope
- Конкретные production secrets
- Подробный CI/CD workflow
- Детали масштабирования beyond MVP

## Current State
Текущий runtime все еще частично ориентирован на legacy single-frontend compose topology:

- `docker-compose.yml` и test compose-файлы по-прежнему поднимают legacy `frontend`
- новые surfaces `frontend-site`, `frontend-landing`, `frontend-pay` уже существуют как отдельные codebase/runtime units
- backend уже использует public URL split (`SITE_PUBLIC_BASE_URL`, `PAY_PUBLIC_BASE_URL`, `API_PUBLIC_BASE_URL`)
- production webhook для bot уже operationally опирается на внешний Apache reverse proxy

Этот шаг фиксирует target topology и deployment contract для multi-domain схемы, даже если часть compose automation будет дотягиваться следующими шагами.

См. также:

- [02 Architecture](../02-architecture.md)
- [06 Deployment And Environments](../06-deployment-and-environments.md)

## Target State
Целевая compose/deploy topology включает app-контейнеры:

- `frontend-site`
- `frontend-landing`
- `frontend-pay`
- `backend`
- `bot`
- `postgres`

Production edge не управляется из `docker compose`. Source of truth для публичного host routing и TLS является внешний Apache layer, который маршрутизирует трафик в compose-сервисы по внутренней сети или localhost-bindings.

Публичный routing:

- `flirto.guru` -> `frontend-site`
- `lp*.flirto.guru` -> `frontend-landing`
- `pay.flirto.guru` -> `frontend-pay`
- `api.flirto.guru` -> `backend`
- `https://<public-host>/tg/webhook/<secret>` -> `bot`

## Service Topology
### Target app services
- `frontend-site` — отдельный Nginx/Vite runtime для `flirto.guru`
- `frontend-landing` — единый landing runtime для всех `lp*` hostnames через host-based manifest
- `frontend-pay` — отдельный pay-only runtime для `pay.flirto.guru`
- `backend` — FastAPI origin для `api.flirto.guru` и внутренних service-to-service вызовов
- `bot` — Telegram service без собственного browser-facing web surface
- `postgres` — единственная stateful database для backend и bot flows

### Build context contract
- Каждый новый frontend собирается только из своей директории:
  - `frontend-site/`
  - `frontend-landing/`
  - `frontend-pay/`
- `frontend_old/` не является build context, runtime dependency или template source для target topology.
- Допустим staged deploy, где legacy surface еще существует параллельно, но он не описывается как target public service.

## Production Routing Contract
### Apache as edge source of truth
- Public host routing и TLS терминация выполняются внешним Apache, а не compose-managed proxy.
- Apache обязан проксировать каждый публичный host ровно в один app service.
- Compose отвечает только за app containers и внутреннюю сеть между ними.

### Host mapping
| Public host | Apache target | Purpose |
|---|---|---|
| `flirto.guru` | `frontend-site` | Основной брендовый сайт |
| `lp*.flirto.guru` | `frontend-landing` | Quiz-first acquisition landing runtime |
| `pay.flirto.guru` | `frontend-pay` | Checkout, success, cancel, manage |
| `api.flirto.guru` | `backend` | Browser-facing API origin |
| `*/tg/webhook/<secret>` | `bot` | Telegram webhook endpoint |

### Internal traffic
- Browser surfaces обращаются к backend только через `https://api.flirto.guru`.
- `bot` использует внутренний `BOT_BACKEND_BASE_URL` и не зависит от browser-facing API host routing.
- `backend` работает с `postgres` только по внутренней сети.

## DNS And TLS Matrix
| Surface | Public hostname pattern | DNS requirement | TLS requirement |
|---|---|---|---|
| Site | `flirto.guru` | A/AAAA или CNAME на edge host | отдельный сертификат или SAN для `flirto.guru` |
| Landing | `lp*.flirto.guru` | wildcard DNS или явные records для каждого landing host | wildcard `*.flirto.guru` или явные сертификаты для всех `lp*` hosts |
| Pay | `pay.flirto.guru` | A/AAAA или CNAME на edge host | отдельный сертификат или SAN для `pay.flirto.guru` |
| API | `api.flirto.guru` | A/AAAA или CNAME на edge host | отдельный сертификат или SAN для `api.flirto.guru` |

### DNS/TLS notes
- `lp*` хосты должны резолвиться в тот же edge layer, что и остальные public domains.
- Wildcard TLS для `*.flirto.guru` допустим, если он покрывает landing hosts и operationally проще явных сертификатов.
- Даже при wildcard TLS Apache vhost mapping обязан явно различать `site`, `landing`, `pay` и `api`.

## Runtime Env Matrix
### Backend
- Public URL authority:
  - `SITE_PUBLIC_BASE_URL`
  - `PAY_PUBLIC_BASE_URL`
  - `API_PUBLIC_BASE_URL`
- Browser access control:
  - `BACKEND_CORS_ALLOW_ORIGINS`
- Payment/webhook:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET`
- Bot/backend integration:
  - `BOT_INTERNAL_TOKEN`
  - `BOT_ALLOWED_PUBLIC_COMMANDS`

### Frontend site
- `API_BASE_URL`
- `PRIMARY_LANDING_URL`

### Frontend landing
- `APP_SURFACE`
- `API_BASE_URL`
- `PAY_PUBLIC_BASE_URL`
- Tracking runtime env:
  - `VITE_MOBI_SLON_URL`
  - `VITE_MOBI_SLON_CAMPAIGN_KEY`
  - `VITE_FB_PIXEL_ID`
  - `VITE_YANDEX_METRIKA_ID`
  - `VITE_TRACKING_DEBUG`

### Frontend pay
- `APP_SURFACE`
- `API_BASE_URL`
- `PAY_PUBLIC_BASE_URL`
- При необходимости tracking env повторяет pay-specific runtime contract без same-origin `/api`

### Bot
- `BOT_BACKEND_BASE_URL`
- `APP_PUBLIC_BASE_URL`
- `BOT_PAY_URL`
- `BOT_MODE`
- `BOT_PORT`
- `BOT_WEBHOOK_PATH_SECRET`

## Dev And Prod-Like Modeling
### Default local dev model
Основной локальный контур остается портовым:

- `frontend-site` -> `http://localhost:5175`
- `frontend-landing` -> `http://localhost:5174`
- `frontend-pay` -> `http://localhost:5176`
- `backend` -> `http://localhost:8000`
- legacy `frontend_old` может продолжать жить на `http://localhost:5173` как transitional reference surface

### Dev notes
- Port-based dev считается базовой схемой для ежедневной разработки.
- Host-based local testing через `hosts` файл и локальный reverse proxy является optional smoke setup для проверки реального `Host` routing, CORS и handoff behavior.
- Пока dev compose не поднял все target services, этот документ остается source of truth для target topology, а не описанием каждого transitional контейнера one-to-one.

### Production-like compose model
- Production compose должен поднимать app containers `frontend-site`, `frontend-landing`, `frontend-pay`, `backend`, `bot`, `postgres`.
- Внешний Apache живет вне compose и маршрутизирует трафик в эти контейнеры.
- Legacy single `frontend` container не является частью целевой production topology.

## Implementation Notes
- Один landing service должен обслуживать все `lp*` hosts.
- Новые frontend services должны иметь независимые Dockerfile и runtime config layers.
- Для локальной разработки может потребоваться hosts-file или reverse proxy, чтобы честно тестировать multi-domain behavior.
- Если production proxy живет вне compose, contract все равно должен быть описан здесь.
- `BACKEND_CORS_ALLOW_ORIGINS` должен соответствовать реальному inventory public origins и не должен возвращаться к wildcard-политике по умолчанию.

## Interfaces / Config / Contracts
- Service contract:
  - `frontend-site`
  - `frontend-landing`
  - `frontend-pay`
  - `backend`
  - `bot`
  - `postgres`
- Edge routing contract:
  - host -> service mapping
- Env contract:
  - public URLs
  - API origin
  - bot/backend internal URLs
  - Stripe and webhook variables

## Deployment Contract
- Production edge routing выполняет внешний Apache.
- `docker compose` не является source of truth для public host routing.
- Browser-facing frontend services обязаны использовать explicit `API_BASE_URL`.
- Backend остается authority для public URLs через `SITE_PUBLIC_BASE_URL`, `PAY_PUBLIC_BASE_URL`, `API_PUBLIC_BASE_URL`.

## Dependencies
- [02-target-architecture-and-domain-map](./02-target-architecture-and-domain-map.md)
- [03-frontend-site-surface](./03-frontend-site-surface.md)
- [04-frontend-landing-platform](./04-frontend-landing-platform.md)
- [05-frontend-pay-surface](./05-frontend-pay-surface.md)
- [06-api-domain-and-backend-contracts](./06-api-domain-and-backend-contracts.md)

## Risks
- Неправильный host routing приведет к неправильным bundles на проде.
- Смешение env between services сломает URL generation и tracking.
- Недостаточно точный локальный dev story скроет cross-domain bugs до production.

## Validation
- Проверить, что для каждого публичного host определен один target service.
- Проверить, что compose topology поддерживает независимую сборку каждого frontend surface.
- Проверить, что env matrix не содержит legacy single-app assumptions.
- Проверить, что production routing описан через внешний Apache, а не через implicit compose proxy.
- Проверить, что новые surfaces используют explicit `API_BASE_URL`, а не same-origin `/api`.

## Acceptance Criteria
- Описана новая service topology.
- Зафиксирована host-based reverse-proxy схема.
- Зафиксированы базовые DNS/TLS требования.
- Описана env matrix для новых services.
- Зафиксировано, что production edge source of truth — внешний Apache.

## Rollback / Fallback
- Допустим staged deploy, где новые services поднимаются параллельно с legacy до момента cutover.
- Fallback состоит в возврате edge routing на legacy stack до переключения DNS/traffic окончательно.
