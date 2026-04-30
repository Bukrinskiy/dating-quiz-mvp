# 05. Frontend Pay Surface

## Status
Шаг завершен.

- Создан отдельный `frontend-pay/` surface.
- Реализованы canonical pay routes:
  - `/:lang/checkout/:uuid`
  - `/:lang/pay/success`
  - `/:lang/pay/cancel`
  - `/:lang/pay/manage`
- Добавлен compatibility redirect с `/:lang/quiz/checkout/:uuid` на canonical pay route.
- Checkout, success, cancel и manage перенесены из legacy как controlled extraction без runtime/build import из `frontend_old/`.
- Все browser API calls нового pay surface используют `API_BASE_URL`, а payment return URLs строятся через `PAY_PUBLIC_BASE_URL`.
- Landing handoff обновлен на `/:lang/checkout/:uuid`.
- `frontend-pay` не хостит свои legal routes и ссылается на shared legal documents на `flirto.guru`.

## Goal
Спроектировать новый `frontend-pay` surface для `pay.flirto.guru`, который полностью владеет payment UX: checkout, success, cancel и manage.

## Why
Payment flow должен быть изолирован от acquisition landing, чтобы:

- не тянуть marketing routing в Stripe-sensitive surface
- упростить legal/payment-specific copy
- унифицировать payment flow для всех landing campaigns
- централизованно управлять return URLs и portal flow

## Scope
- Новый `frontend-pay`
- Checkout page
- Success/cancel/manage pages
- Handoff contract от landing в pay
- Runtime/public URL assumptions для payment surface

## Out of Scope
- Создание нового payment provider
- Реализация acquisition landing
- Backend payment logic beyond public contracts

## Current State
Сейчас payment UX является частью legacy frontend funnel и живет в маршрутах того же SPA.

## Target State
- `pay.flirto.guru` обслуживается отдельным frontend surface.
- Все payment-related user pages рендерятся только здесь.
- Любой landing передает пользователя в payment surface через session context.
- `frontend-pay` использует `api.flirto.guru` для session/order/payment operations.

## What Must Be Done
- Зафиксировать page set для `pay`:
  - checkout
  - success
  - cancel
  - manage
- Описать handoff contract от landing к pay.
- Описать источники данных `pay` surface:
  - session uuid
  - order id в success flow
  - portal return flow
- Описать public URL generation rules.
- Исключить использование `window.location.origin` как основы для API и return URLs.

## Implementation Notes
- `pay` должен быть максимально универсальным для разных landing campaigns.
- Campaign-specific merchandising допустимо подтягивать по session context и attribution полям.
- `frontend-pay` должен быть новым surface с собственным app shell и asset/runtime boundaries.
- Если часть checkout UI переносится из legacy, перенос должен идти как controlled extraction.

## Interfaces / Config / Contracts
- Runtime config:
  - `APP_SURFACE=pay`
  - `API_BASE_URL`
  - `PAY_PUBLIC_BASE_URL`
- Routing contract:
  - `/:lang/checkout/:uuid`
  - `/:lang/pay/success`
  - `/:lang/pay/cancel`
  - `/:lang/pay/manage`
- Handoff contract:
  - landing создает session
  - pay читает session context по `uuid`
- URL contract:
  - success/cancel/manage URLs всегда привязаны к `pay.flirto.guru`

## Dependencies
- [01-legacy-freeze-and-old-layout](./01-legacy-freeze-and-old-layout.md)
- [02-target-architecture-and-domain-map](./02-target-architecture-and-domain-map.md)
- [04-frontend-landing-platform](./04-frontend-landing-platform.md)

## Risks
- Скрытые legacy assumptions о same-origin маршрутах приведут к broken returns.
- Неправильный handoff contract может потерять `clickid` или campaign attribution.
- Перенос checkout UI без surface isolation сохранит старый coupling.

## Validation
- Проверить, что checkout можно открыть независимо от landing app shell.
- Проверить, что success/cancel/manage работают на `pay` домене.
- Проверить, что pay surface не использует landing-specific routes и assets по умолчанию.

## Acceptance Criteria
- Описан отдельный `frontend-pay` surface и его страницы.
- Зафиксирован handoff contract от landing к pay.
- Зафиксировано, что все payment return URLs строятся от `pay.flirto.guru`.
- Исключена зависимость от browser origin для API/return URL generation.

## Rollback / Fallback
- В аварийной ситуации допустим временный redirect с payment route на старую flow-страницу.
- Это fallback только на период cutover, а не альтернативная целевая модель.

## Open Questions
- Нет. В шаге 5 `pay` использует shared legal links на `flirto.guru` и не заводит локальные legal routes.
