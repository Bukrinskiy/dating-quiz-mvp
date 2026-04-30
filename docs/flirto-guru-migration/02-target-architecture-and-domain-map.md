# 02. Target Architecture And Domain Map

## Goal
Зафиксировать целевую карту доменов, surface-ов, контейнеров, сетевых маршрутов и ownership boundaries для новой платформы `Flirto Guru`.

## Why
Без единой target architecture команда начнет принимать локальные решения по каждому сервису, что приведет к:

- смешению responsibilities между `landing`, `pay` и `site`
- дублированию UI/runtime logic
- inconsistent domain routing
- конфликтам между API, payment flow и tracking

Этот документ нужен как источник истины до начала реализации новых контейнеров и backend contracts.

## Scope
- Публичные домены и их назначение
- Surface model
- Container model
- Network and reverse-proxy routing
- Responsibility boundaries между frontend surfaces и backend

## Out of Scope
- Детали UI/UX каждой страницы
- Детальные API schemas
- Конкретные compose/env файлы

## Current State
Текущая архитектура остается legacy single-surface схемой:

- единственный browser-facing frontend surface живет в `frontend_old/`
- legacy SPA совмещает acquisition funnel, email capture, checkout и post-payment routes
- browser calls идут либо через same-origin `/api`, либо через dev proxy, а не через выделенный `api` домен
- `frontend_old/nginx.conf`, runtime-config template и entrypoint scripts заточены под single-domain runtime
- `backend` и `bot` уже выделены как отдельные сервисы, но публичная web-схема все еще monolithic с точки зрения frontend surface

См. также:

- [02 Architecture](../02-architecture.md)
- [06 Deployment And Environments](../06-deployment-and-environments.md)
- [10 Frontend Journeys And Routing](../10-frontend-journeys-and-routing.md)

## Target State
Целевая система состоит из четырех публичных доменов:

- `flirto.guru` — основной бренд-сайт
- `lp*.flirto.guru` — landing pages
- `pay.flirto.guru` — payment frontend
- `api.flirto.guru` — browser-facing API origin

Целевая container topology:

- `frontend-site`
- `frontend-landing`
- `frontend-pay`
- `backend`
- `bot`
- `postgres`

Legacy `frontend_old/` сохраняется только как reference surface до cutover и не является build/runtime base для новых surfaces.

## Domain -> Surface -> Container Map
| Public domain | Surface | Primary container | Purpose |
|---|---|---|---|
| `flirto.guru` | `site` | `frontend-site` | Основной бренд-сайт, контентные и trust-entry страницы бренда |
| `lp*.flirto.guru` | `landing` | `frontend-landing` | Acquisition landing pages и quiz entry funnel в фазе 1 |
| `pay.flirto.guru` | `pay` | `frontend-pay` | Checkout, payment status pages и payment-specific UX c shared legal links |
| `api.flirto.guru` | `api` | `backend` | Browser-facing API origin для session, payment, tracking и business logic |

Ни один публичный домен не должен одновременно резолвиться в несколько frontend surfaces как в целевой модели.

## Surface Responsibilities
### `site`
- владеет брендовой навигацией, SEO/marketing страницами и общим trust-контентом верхнего уровня
- не рендерит quiz funnel entry как primary acquisition flow
- не рендерит checkout, payment status и manage flow

### `landing`
- владеет acquisition entry, host-specific campaign presentation и quiz funnel phase-1 flow
- стартует session context и передает пользователя в `pay`
- не является владельцем final payment UX, post-payment routes и payment account management

### `pay`
- владеет checkout UX, success/cancel/manage маршрутами и payment-specific legal/trust presentation
- использует session context, созданный до handoff из `landing`
- не используется как acquisition landing surface

### `api`
- владеет browser-facing session, payment, tracking, attribution и business logic contracts
- является единственной внешней API точкой для всех новых frontend surfaces
- не предполагает, что frontend работает через implicit same-origin `/api`

### `bot`
- остается отдельным non-browser service
- использует внутренние backend contracts и не получает собственный публичный web surface в рамках этого шага
- должен ориентироваться на новую multi-domain схему ссылок и handoff contracts в следующих шагах, но не определяет публичный domain map

## Container Model
- `frontend-site` собирается только из нового site-каталога и обслуживает только host `flirto.guru`
- `frontend-landing` собирается только из нового landing-каталога и обслуживает `lp*` hosts через host-based manifest
- `frontend-pay` собирается только из нового pay-каталога и обслуживает только `pay.flirto.guru`
- `backend` обслуживает `api.flirto.guru` и внутренние service-to-service вызовы
- `bot` и `postgres` не являются browser-facing контейнерами
- `frontend_old/` не используется как build context, runtime dependency или source of truth для новых контейнеров

## Network And Routing Model
### Browser traffic
- запросы к `flirto.guru` попадают только в `frontend-site`
- запросы к `lp*.flirto.guru` попадают только в `frontend-landing`
- запросы к `pay.flirto.guru` попадают только в `frontend-pay`
- browser XHR/fetch calls из `site`, `landing` и `pay` адресуются на `https://api.flirto.guru/...`

### Cross-domain handoff
- handoff `landing` -> `pay` происходит через session context, созданный backend-ом
- `landing` не завершает оплату на своем домене и не держит final checkout routes как target architecture
- `pay` читает только необходимые session/payment данные из `api`, а не из legacy same-origin proxy

### Internal traffic
- reverse proxy или edge routing распределяет публичные hosts по соответствующим контейнерам
- service-to-service вызовы (`frontend*` -> `backend`, `bot` -> `backend`, `backend` -> `postgres`) идут по внутренней сети
- временный edge rewrite для `api` допустим только как transitional deployment workaround и не меняет target contract `browser -> api.flirto.guru`

## Multi-Landing Model
- один `frontend-landing` runtime обслуживает несколько `lp*` hostnames
- variation между landing hosts определяется host-based manifest/config слоем, а не отдельным контейнером на каждый host
- phase 1 ограничивается quiz-first landing model, но структура manifest должна допускать будущие non-quiz campaigns
- host-specific контент, tracking и offer orchestration должны настраиваться без разветвления container topology

## What Must Be Done
- Зафиксировать domain-to-surface mapping.
- Зафиксировать surface-to-container mapping.
- Зафиксировать ownership boundaries:
  - `site` отвечает за брендовый сайт
  - `landing` отвечает за acquisition funnel entry
  - `pay` отвечает за payment UX
  - `api` отвечает за session/payment/tracking/business logic
- Зафиксировать network routing:
  - публичные hosts ведут в соответствующие containers
  - browser API calls идут на `api.flirto.guru`
  - service-to-service traffic идет по внутренней сети
- Зафиксировать, что один `frontend-landing` обслуживает много `lp*` hosts через host-based manifest
- Зафиксировать, что `frontend_old/` остается только legacy reference path и не участвует в target runtime

## Implementation Notes
- На уровне architecture decision не нужно создавать отдельный container на каждый `lpN`.
- Landing platform должна быть multi-tenant на уровне host routing, но single implementation surface на уровне runtime.
- `pay` и `site` выделяются отдельно, потому что они несут different constraints:
  - `site` — маркетинговый брендовый сайт
  - `pay` — Stripe-sensitive frontend с payment/legal/trust constraints
- `api.flirto.guru` лучше считать единственным external API origin уже в фазе 1, чтобы новые frontend surfaces не оставались привязаны к same-origin proxy модели.

## Interfaces / Config / Contracts
- Domain contract:
  - `flirto.guru` -> `frontend-site`
  - `lp*.flirto.guru` -> `frontend-landing`
  - `pay.flirto.guru` -> `frontend-pay`
  - `api.flirto.guru` -> `backend`
- Surface contract:
  - `site` не рендерит payment checkout
  - `landing` не является владельцем финального payment UX
  - `pay` не является acquisition landing
  - `bot` не становится отдельным публичным web surface в этой фазе
- Routing contract:
  - handoff `landing` -> `pay` происходит через session context
  - все browser-facing backend calls идут в `api`
  - same-origin `/api` не является target contract для новых surfaces
- Runtime contract:
  - `frontend_old/` остается legacy reference only
  - новые surfaces не используют legacy frontend как build context или implicit runtime dependency

## Dependencies
- Основано на стратегии из [01-legacy-freeze-and-old-layout](./01-legacy-freeze-and-old-layout.md)

## Risks
- Нечеткие surface boundaries вызовут дублирование routing и контента.
- Недостаточно строгий domain map создаст постоянные исключения в deploy и tracking.
- Неправильный ownership split усложнит поддержку и rollback.

## Validation
- Проверить, что каждая публичная функция системы однозначно принадлежит одному surface.
- Проверить, что все будущие task-файлы используют эту карту как исходную модель.
- Проверить, что схема не оставляет hidden same-origin assumptions.
- Проверить, что target topology отделена от текущего legacy `frontend_old/` runtime и не использует его как active base.

## Acceptance Criteria
- Для каждого домена определен один владелец и один основной container target.
- Для каждого surface определена зона ответственности.
- Зафиксирована multi-landing модель через host-based manifests.
- `api.flirto.guru` признан целевым browser-facing API origin для фазы 1.
- Зафиксировано, что `frontend_old/` остается только legacy reference surface и не участвует в новых build/runtime flows.

## Rollback / Fallback
- Если на раннем этапе отдельный `api` домен окажется operationally слишком дорогим, допускается временный edge rewrite слой.
- Такая временная мера не должна менять target architecture и должна рассматриваться только как transitional deployment workaround.

## Open Questions
- Конкретный reverse-proxy стек для production cutover: Nginx, Apache, Traefik или внешний CDN/LB.
