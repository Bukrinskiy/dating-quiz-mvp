# 08. Bot, Tracking And Integrations

## Goal
Адаптировать bot links, tracking flows и внешние интеграции под новую multi-domain схему `landing -> pay -> api`.

## Why
Даже если новые surfaces собраны корректно, система останется broken, если:

- бот продолжит слать пользователя на старые URLs
- tracking потеряет `clickid` при cross-domain переходах
- Stripe/webhook callbacks будут собирать неправильные public URLs

Эта задача критична для коммерческой работоспособности миграции.

## Scope
- Telegram bot payment links
- Tracking and attribution flow
- Clickid propagation
- Mobi-Slon/Meta/analytics cross-domain behavior
- Stripe/webhook side effects

## Out of Scope
- Полная переработка tracking providers
- Новый бот UX beyond required URL updates
- Замена текущего payment provider

## Current State
Существующие integration assumptions завязаны на legacy single-app public URLs и текущий routing funnel.

См. также:

- [09 API And Integrations](../09-api-and-integrations.md)
- [08 Observability And Operations](../08-observability-and-operations.md)

## Target State
- Bot использует новый `pay` URL contract и не возвращает пользователя в legacy web flow.
- Cross-domain переходы между `lp*`, `pay` и `api` не теряют attribution.
- Public tracking endpoints совместимы с отдельным API origin.
- Stripe/webhook side effects продолжают работать после доменного split.

## What Must Be Done
- Зафиксировать новые bot URL contracts:
  - `BOT_PAY_URL`
- Явно выбрать v1 default для bot entry:
  - `BOT_LANDING_URL` не вводится в фазе 1, пока bot не ведет пользователя в landing funnel
- Описать правила clickid/source propagation между surfaces.
- Описать behavior tracking relay при вызовах в `api.flirto.guru`.
- Проверить все payment side effects:
  - success flow
  - webhook-triggered states
  - portal returns
- Описать, какие query params и attribution fields должны переживать handoff.

## Implementation Notes
- Лучше использовать явные bot URLs, а не полагаться на fallback от общего app base URL.
- В v1 bot ведет пользователя напрямую в pay surface, а не в landing funnel.
- Bot добавляет `tg_chat_id` в pay URL, чтобы pay/backend flow мог связать оплату с Telegram пользователем.
- Tracking logic должна быть совместима с cross-origin API calls и при этом не полагаться на old same-origin beacons.
- Необходимо различать:
  - acquisition attribution
  - payment state changes
  - internal service-to-service callbacks

## Interfaces / Config / Contracts
- Bot config:
  - `BOT_PAY_URL`
  - `BOT_LANDING_URL` остается future extension и не является обязательным env в v1
- Attribution contract:
  - `clickid`
  - `landing_id`
  - `entry_host`
  - `entry_path`
  - `tracking_params`
- Tracking contract:
  - browser surfaces передают события только в `api.flirto.guru`
  - `frontend-landing` и `frontend-pay` сохраняют source params в browser storage и прокидывают их в handoff/query/API payloads
  - cross-domain handoff не теряет source parameters
  - `pay_success` запрещен из frontend relay и отправляется только server-side из Stripe webhook по `order.clickid`

## Current Runtime Alignment
- Bot использует `BOT_PAY_URL` как основной публичный контракт; если переменная не задана, включается fallback `${PAY_PUBLIC_BASE_URL}/ru/pay/manage`.
- Кнопка оплаты из bot добавляет `tg_chat_id` к pay URL.
- Web funnel acquisition attribution живет отдельно от bot deep-link и передается через `clickid`, `landing_id`, `entry_host`, `entry_path`, `tracking_params`.
- `frontend-landing` и `frontend-pay` сохраняют tracking query params в `sessionStorage` и переиспользуют их при навигации и API вызовах.
- Public tracking relay идет в `API_PUBLIC_BASE_URL`; browser не является authority для `pay_success`.
- Stripe webhook остается единственной server-side точкой для post-payment `pay_success` postback и payment completion side effects.

## Dependencies
- [04-frontend-landing-platform](./04-frontend-landing-platform.md)
- [05-frontend-pay-surface](./05-frontend-pay-surface.md)
- [06-api-domain-and-backend-contracts](./06-api-domain-and-backend-contracts.md)
- [07-compose-and-deployment-topology](./07-compose-and-deployment-topology.md)

## Risks
- Потеря `clickid` и campaign attribution между domains.
- Старые bot fallback links могут вернуть пользователей в legacy flow.
- Tracking providers могут вести себя иначе при cross-origin call patterns.
- Частичная деградация analytics после cutover может скрыть marketing attribution, даже если core payment flow продолжит работать.

## Validation
- Проверить полный путь пользователя из bot в landing/pay.
- Проверить, что tracking события содержат корректные attribution values после domain transitions.
- Проверить, что webhook-driven payment completion не ломает user-facing success flow.

## Acceptance Criteria
- Новые bot URL contracts определены.
- Описана стратегия сохранения attribution между `lp*`, `pay` и `api`.
- Описаны точки риска для Stripe/webhook и tracking providers.
- Исключена зависимость на legacy single-domain fallback URLs.
- Зафиксировано, что `BOT_PAY_URL` является единственным обязательным bot-facing public URL contract в v1.
- Зафиксировано, что frontend не отправляет `pay_success`.

## Rollback / Fallback
- Если часть tracking stack не готова к cross-domain cutover, допустим временный degraded analytics mode.
- Такой fallback не должен затрагивать core payment completion и bot access flows.

## Open Questions
- Какие provider-specific ограничения у текущих Meta/Mobi-Slon настроек на проде потребуют отдельной ручной валидации после cutover.
