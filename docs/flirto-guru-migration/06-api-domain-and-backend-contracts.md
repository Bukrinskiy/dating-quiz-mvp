# 06. API Domain And Backend Contracts

## Goal
Перевести browser-facing backend на `api.flirto.guru` и зафиксировать backend contracts, URL generation rules, CORS policy и attribution model для новой multi-domain архитектуры.

## Why
Отдельный API origin нужен в фазе 1, чтобы:

- отвязать frontend surfaces от legacy same-origin `/api`
- дать стабильный backend entrypoint для `site`, `landing` и `pay`
- упростить долгосрочное развитие новых surfaces и интеграций

Но это усложняет cross-origin browser behavior, поэтому контракт должен быть описан заранее.

## Scope
- `api.flirto.guru` как public backend origin
- Backend config split по public URLs
- CORS policy
- Session/order attribution fields
- Public URL generation for pay flow
- Browser API client expectations

## Out of Scope
- Внутренний refactor business logic без необходимости
- Выделение internal API в отдельный сервис
- Замена текущего payment provider

## Current State
Backend конфигурация и frontend клиенты исторически завязаны на общие base URLs и same-origin assumptions. Payment URLs и bot fallback logic завязаны на single-domain thinking.

См. также:

- [06 Deployment And Environments](../06-deployment-and-environments.md)
- [09 API And Integrations](../09-api-and-integrations.md)

## Target State
- Все browser-facing frontend surfaces используют `https://api.flirto.guru`.
- Backend config разводит публичные URL по назначениям.
- Session и order сохраняют campaign attribution.
- Payment return URLs строятся от `pay.flirto.guru`.

## What Must Be Done
- Ввести `API_PUBLIC_BASE_URL`.
- Ввести отдельные backend config values:
  - `SITE_PUBLIC_BASE_URL`
  - `PAY_PUBLIC_BASE_URL`
  - `API_PUBLIC_BASE_URL`
- Определить CORS allowlist для:
  - `https://flirto.guru`
  - `https://pay.flirto.guru`
  - `https://lp*.flirto.guru` или явного списка landing domains
- Убрать implicit same-origin assumptions из frontend API clients.
- Расширить session/order attribution:
  - `brand`
  - `landing_id`
  - `entry_host`
  - `entry_path`
- Обновить URL generation rules для success/cancel/manage.

## Implementation Notes
- Wildcard CORS policy для `lp*` нужно проектировать осторожно; предпочтительнее explicit host allowlist, если это operationally возможно.
- Browser credentials policy должна быть единообразной для всех public frontend surfaces.
- Service-to-service endpoints bot/backend могут остаться в том же приложении, но должны быть логически отделены от browser public API.
- Не нужно ради архитектурной чистоты массово переименовывать исторические сущности вроде `quiz_sessions`, если это не дает функциональной пользы в фазе 1.

## Interfaces / Config / Contracts
- Frontend runtime:
  - `API_BASE_URL=https://api.flirto.guru`
- Backend config:
  - `SITE_PUBLIC_BASE_URL`
  - `PAY_PUBLIC_BASE_URL`
  - `API_PUBLIC_BASE_URL`
  - `BOT_PAY_URL`
- Attribution contract:
  - session creation обязана принимать campaign context
  - payment creation обязана сохранять landing attribution
- URL contract:
  - `success`, `cancel`, `manage` привязаны к `PAY_PUBLIC_BASE_URL`

## Dependencies
- [01-legacy-freeze-and-old-layout](./01-legacy-freeze-and-old-layout.md)
- [02-target-architecture-and-domain-map](./02-target-architecture-and-domain-map.md)
- [04-frontend-landing-platform](./04-frontend-landing-platform.md)
- [05-frontend-pay-surface](./05-frontend-pay-surface.md)

## Risks
- CORS/preflight issues сломают browser traffic после cutover.
- Смешение old/new base URL config приведет к partial routing failures.
- Потеря attribution полей исказит аналитику и payment reporting.

## Validation
- Проверить cross-origin browser requests из `site`, `landing` и `pay`.
- Проверить session creation и payment flow через новый `api` origin.
- Проверить, что generated URLs указывают на правильные public domains.

## Acceptance Criteria
- `api.flirto.guru` признан единым browser-facing API origin.
- Описана CORS policy и public URL config split.
- Описаны attribution fields и их назначение.
- Payment URLs больше не выводятся из legacy общего app base URL.

## Rollback / Fallback
- Допустим временный edge rewrite `surface -> backend`, если production cutover на отдельный API origin блокируется infra constraints.
- Такой fallback не отменяет target contract и должен быть временным.

## Open Questions
- Будет ли allowlist origins храниться в env/config или генерироваться из централизованного inventory landing domains.
