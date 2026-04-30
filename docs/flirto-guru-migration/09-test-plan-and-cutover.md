# 09. Test Plan And Cutover

## Goal
Зафиксировать исполнимый runbook для валидации, staged rollout, production cutover и rollback при переходе на multi-domain архитектуру `Flirto Guru`.

## Why
Даже при готовых `site`, `landing`, `pay` и `api` миграция остается рискованной без одного документа, который фиксирует:

- обязательную smoke/regression матрицу
- production-like rehearsal до финального переключения
- go/no-go условия для cutover окна
- rollback шаги без экстренного редактирования кода

## Scope
- Smoke/regression matrix для `site`, `landing`, `pay`, `api` и `bot`
- Rehearsal checklist для production-like среды
- Staged rollout sequence
- Go/no-go contract
- Rollback triggers и rollback sequence
- Post-cutover observation window

## Out Of Scope
- Низкоуровневые unit tests отдельных модулей
- Полный redesign CI/CD
- Долгосрочные observability improvements beyond cutover needs

## Current State
Текущая система тестируется как legacy single-frontend/backend stack с базовыми smoke route checks.

См. также:

- [05 Testing Strategy](../05-testing-strategy.md)
- [06 Deployment And Environments](../06-deployment-and-environments.md)
- [11 Troubleshooting](../11-troubleshooting.md)

## Target State
- Есть единая end-to-end smoke/regression матрица для `flirto.guru`, `lp*.flirto.guru`, `pay.flirto.guru`, `api.flirto.guru` и bot flow.
- Есть production-like rehearsal, который выполняется до финального public switch.
- Есть staged rollout sequence без смешивания legacy и target routing в публичном трафике.
- Есть go/no-go критерии и rollback steps, не требующие code changes во время инцидента.

## Current Runtime Alignment
- Целевая production topology описана как `frontend-site` / `frontend-landing` / `frontend-pay` / `backend` / `bot` / `postgres`.
- Production edge source of truth остается внешний Apache, а не `docker compose`.
- Текущий production deploy в репозитории все еще ориентирован на legacy `frontend` container:
  - `docker-compose.yml` публикует только `frontend`
  - `make deploy` перезапускает удаленный compose без target surface split
- Из-за этого production cutover считается blocked до тех пор, пока production compose/deploy topology не будет доведена до target-схемы.
- Этот gap входит в go/no-go как жесткий blocker, а не как необязательный риск.

## Smoke And Regression Matrix

### `flirto.guru` (`frontend-site`)
- Открываются брендовые и легальные страницы без перехода в legacy SPA shell.
- CTA и primary navigation ведут в target landing flow, а не в `frontend_old`.
- Browser calls, если они есть, идут только в `API_PUBLIC_BASE_URL`.
- Legal links на `pay` и `landing` указывают на target public hosts.

### `lp1.flirto.guru` (`frontend-landing`)
- Открывается quiz entry route.
- Работают ключевые шаги funnel:
  - quiz start
  - answer progression
  - session creation
  - email step
- Handoff в `pay.flirto.guru` использует target public URL и сохраняет attribution.
- Browser calls идут в `api.flirto.guru`, без same-origin `/api`.

### `pay.flirto.guru` (`frontend-pay`)
- Работает canonical route `/:lang/checkout/:uuid`.
- Работают `success`, `cancel`, `manage`.
- Backend-generated public URLs ведут в `pay.flirto.guru`, а не в legacy routes.
- Если на cutover-период поддерживается legacy redirect `/:lang/quiz/checkout/:uuid`, он проверяется отдельно и не становится целевым контрактом.

### `api.flirto.guru` (`backend`)
- `GET /health` возвращает `200`.
- CORS/preflight работает для `flirto.guru`, `lp*.flirto.guru` и `pay.flirto.guru`.
- Browser API calls из `site`, `landing` и `pay` успешны и не упираются в mixed-origin policy.
- Backend authority по public URLs подтверждена:
  - `SITE_PUBLIC_BASE_URL`
  - `PAY_PUBLIC_BASE_URL`
  - `API_PUBLIC_BASE_URL`

### Bot Flow
- Bot генерирует pay links через `BOT_PAY_URL`.
- В pay link сохраняется `tg_chat_id`.
- После успешной оплаты доступ в bot активируется корректно.
- Bot links не возвращают пользователя в legacy web flow.

### Tracking And Attribution
- На входе в landing сохраняются:
  - `clickid`
  - `landing_id`
  - `entry_host`
  - `entry_path`
  - `tracking_params`
- Переход `landing -> pay` не теряет attribution.
- Browser events и relay идут в `api.flirto.guru`.
- `pay_success` остается только server-side эффектом Stripe webhook и не отправляется frontend-ом.

## Rehearsal Checklist
Production cutover запрещен без production-like rehearsal с реальными host headers и максимально близкой схемой public URLs.

Rehearsal включает:

1. Развернуть target services без public switch на legacy traffic.
2. Проверить host-based routing через внешний Apache или эквивалентную production-like эмуляцию.
3. Проверить runtime env:
   - `SITE_PUBLIC_BASE_URL`
   - `PAY_PUBLIC_BASE_URL`
   - `API_PUBLIC_BASE_URL`
   - `BACKEND_CORS_ALLOW_ORIGINS`
   - `BOT_PAY_URL`
4. Пройти полную smoke/regression матрицу для `site`, `landing`, `pay`, `api` и `bot`.
5. Проверить backend-generated public URLs в email/payment/session flows.
6. Проверить continuity attribution между `lp*`, `pay` и `api`.
7. Подтвердить отсутствие запросов в legacy same-origin `/api` и отсутствие возврата в legacy frontend.
8. Зафиксировать sign-off от владельцев frontend/backend/infra до назначения production cutover окна.

## Staged Rollout Sequence

### 1. Pre-Cutover Preparation
- Синхронизировать server `.env` с target env matrix.
- Подтвердить, что production compose/deploy topology обновлена под target services.
- Подтвердить, что Apache routing для `flirto.guru`, `lp*.flirto.guru`, `pay.flirto.guru`, `api.flirto.guru` подготовлен, но еще не переключен на public traffic.
- Подтвердить, что rollback path на legacy routing сохранен и проверен операционно.

### 2. Internal Bring-Up
- Поднять новые services параллельно с legacy stack.
- Проверить healthchecks и внутреннюю связность `frontend-* -> backend`, `bot -> backend`, `backend -> postgres`.
- Выполнить internal smoke без public switch.

### 3. Rehearsal Sign-Off
- Выполнить rehearsal checklist целиком.
- Подтвердить, что все critical checks green.
- Получить явный sign-off на cutover окно.

### 4. Production Cutover
- Переключить Apache host routing и/или DNS на target services.
- Не совмещать это окно с irreversible schema/data changes без отдельного backup/restore runbook.
- Не допускать mixed-domain состояния, где часть public hosts уже target, а часть критических handoff-ов еще legacy.

### 5. Post-Cutover Smoke
- Немедленно повторить critical smoke:
  - `flirto.guru`
  - `lp1.flirto.guru`
  - `pay.flirto.guru`
  - `api.flirto.guru/health`
  - bot pay link
  - `landing -> pay` handoff
  - payment success/cancel/manage
- Проверить CORS/preflight в браузере и backend-generated pay URLs.

### 6. Observation Window
- Держать короткое post-cutover observation окно с повышенным вниманием к:
  - payment handoff failures
  - broken CORS/preflight
  - bot access activation
  - потерям attribution
- Если critical regression выявлен в этом окне, применять rollback без попытки emergency patching на проде.

## Go / No-Go Contract
Cutover разрешен только если одновременно выполнены все условия:

- target deploy topology реально развернута и не зависит от legacy `frontend`
- все critical smoke/regression checks green
- `BACKEND_CORS_ALLOW_ORIGINS` покрывает все public origins без wildcard fallback
- backend генерирует public URLs только через `SITE_PUBLIC_BASE_URL`, `PAY_PUBLIC_BASE_URL`, `API_PUBLIC_BASE_URL`
- bot pay links используют target contract и не ведут в legacy flow
- `landing -> pay` handoff не теряет session и attribution
- rehearsal завершен и подписан владельцами релиза

Любой невыполненный пункт означает `no-go`.

## Rollback Triggers
Rollback обязателен при любом из условий:

- критический public host отдает не тот surface
- broken CORS/preflight блокирует browser API calls
- payment handoff или checkout flow ведет в legacy flow или не открывается
- bot pay links перестают приводить к рабочему checkout/manage flow
- success/cancel/manage не работают после switch
- теряется core attribution или ломается webhook-driven payment completion

## Rollback Sequence

### Primary Rollback
- Вернуть Apache routing и/или DNS на legacy stack.
- Подтвердить, что legacy public flow снова доступен пользователям.
- Остановить дальнейший rollout до разбора причин.

### Secondary Rollback
- Снять новые public routes с traffic path, не меняя код во время инцидента.
- Оставить target services поднятыми только для внутреннего анализа, если это не мешает восстановлению legacy traffic.

### Data Safety Rule
- Любые destructive migrations или irreversible data/schema changes допустимы только при наличии отдельного backup/restore runbook.
- Если такого runbook нет, cutover окно должно быть ограничено routing/env switch без необратимых изменений данных.

## Interfaces / Config / Contracts
- Smoke matrix contract:
  - `site`, `landing`, `pay`, `api`, `bot` проверяются как отдельные surfaces
- Rehearsal contract:
  - rehearsal обязателен и выполняется до production cutover
- Go/no-go contract:
  - blocker по legacy deploy topology обязателен к снятию до go-live
- Rollback contract:
  - rollback выполняется через edge/DNS routing, а не через emergency code changes

## Dependencies
- [01](./01-legacy-freeze-and-old-layout.md)
- [02](./02-target-architecture-and-domain-map.md)
- [03](./03-frontend-site-surface.md)
- [04](./04-frontend-landing-platform.md)
- [05](./05-frontend-pay-surface.md)
- [06](./06-api-domain-and-backend-contracts.md)
- [07](./07-compose-and-deployment-topology.md)
- [08](./08-bot-tracking-and-integrations.md)

## Risks
- Частичный public switch приведет к mixed-domain behavior и непредсказуемому handoff.
- Недостаточный smoke scope пропустит CORS, bot link или payment return regressions.
- Попытка cutover без обновления production deploy topology оставит target architecture только на уровне документов.
- Отсутствие четкого rollback решения увеличит время production outage.

## Validation
- Проверить, что matrix покрывает все critical surfaces и cross-domain handoff-ы.
- Проверить, что rollout sequence исполним через env/deploy/routing операции без code edits.
- Проверить, что blocker по legacy production deploy явно зафиксирован как `no-go`.
- Проверить, что rollback можно выполнить операционно без кризисного изменения приложения.

## Acceptance Criteria
- Описан end-to-end smoke/regression matrix для `site`, `landing`, `pay`, `api` и `bot`.
- Встроен rehearsal checklist для production-like среды.
- Зафиксирован staged rollout sequence с post-cutover smoke и observation window.
- Зафиксированы go/no-go условия, включая blocker по legacy production deploy topology.
- Зафиксирован rollback plan для edge/domain cutover без emergency code changes.
