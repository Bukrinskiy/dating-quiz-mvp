# Flirto Guru Migration Program

## Summary
Этот пакет документов фиксирует программу перехода проекта на новую архитектуру `Flirto Guru` с раздельными публичными доменами:

- `flirto.guru` — основной бренд-сайт
- `lp*.flirto.guru` — landing pages с quiz funnel в фазе 1
- `pay.flirto.guru` — отдельный payment frontend
- `api.flirto.guru` — отдельный backend API origin

Базовый принцип миграции:

- legacy директории не используются как основа новой архитектуры
- legacy исходники и runtime-артефакты переименовываются в `*_old`
- новые surfaces, контейнеры и runtime-конфиги создаются заново
- допустимо только осознанное копирование отдельных assets, shared решений и контента после ревью

## Program Rules
- Не использовать legacy директории как build context для новых контейнеров.
- Не копировать старые Dockerfile, Nginx-конфиги и entrypoint-скрипты без явной адаптации под новую схему доменов.
- Не смешивать старые SPA routes и новые surface-specific routes в одном app shell.
- Новые containers должны собираться только из новых директорий, кроме осознанно выбранных shared модулей.
- Все публичные browser calls должны ориентироваться на `api.flirto.guru`, а не на implicit same-origin `/api`.
- В фазе 1 поддерживается только `quiz`-landing, но структура должна оставлять место для будущих non-quiz campaigns.

## Task Order
- [x] [01. Legacy Freeze And `*_old` Layout](./01-legacy-freeze-and-old-layout.md)
  Цель: зафиксировать границы legacy системы, правила переименования и запрет на случайный reuse старых runtime/build артефактов.
  Статус: legacy frontend surface переименован в `frontend_old/`, reuse policy зафиксирован.
  Зависимости: нет.

- [x] [02. Target Architecture And Domain Map](./02-target-architecture-and-domain-map.md)
  Цель: зафиксировать конечную карту доменов, surface-ов, контейнеров и responsibility split.
  Статус: domain map, surface/container ownership и `api.flirto.guru` как browser-facing API origin зафиксированы.
  Зависимости: `01`.

- [x] [03. Frontend Site Surface](./03-frontend-site-surface.md)
  Цель: спроектировать новый `frontend-site` для `flirto.guru`.
  Статус: создан отдельный `frontend-site/` surface с FSD-scaffold, brand/legal routing и runtime contract `PRIMARY_LANDING_URL`.
  Зависимости: `01`, `02`.

- [x] [04. Frontend Landing Platform](./04-frontend-landing-platform.md)
  Цель: спроектировать и реализовать новый `frontend-landing` для `lp*.flirto.guru` с host-based manifest и quiz-only v1.
  Статус: создан отдельный `frontend-landing/` surface с FSD-структурой, strict host resolver, session/email flow и handoff contract в `pay`.
  Зависимости: `01`, `02`.

- [x] [05. Frontend Pay Surface](./05-frontend-pay-surface.md)
  Цель: спроектировать новый `frontend-pay` для checkout, success, cancel и manage.
  Статус: создан отдельный `frontend-pay/` surface с pay-only app shell, canonical route `/:lang/checkout/:uuid`, legacy redirect с `/:lang/quiz/checkout/:uuid`, API calls через `API_BASE_URL` и shared legal links на `flirto.guru`.
  Зависимости: `01`, `02`, `04`.

- [x] [06. API Domain And Backend Contracts](./06-api-domain-and-backend-contracts.md)
  Цель: перевести backend на `api.flirto.guru` и развести URL/config/session contracts.
  Статус: backend переведен на public URL split (`SITE_PUBLIC_BASE_URL`, `PAY_PUBLIC_BASE_URL`, `API_PUBLIC_BASE_URL`), добавлены explicit CORS origins, session/order attribution (`brand`, `landing_id`, `entry_host`, `entry_path`) и pay URL generation от `pay.flirto.guru`.
  Зависимости: `01`, `02`, `04`, `05`.

- [x] [07. Compose And Deployment Topology](./07-compose-and-deployment-topology.md)
  Цель: описать новые контейнеры, compose topology, reverse proxy и env matrix.
  Статус: зафиксирована target topology для `frontend-site` / `frontend-landing` / `frontend-pay` / `backend` / `bot` / `postgres`, production edge вынесен во внешний Apache, описаны host routing, DNS/TLS и runtime env matrix.
  Зависимости: `01`, `02`, `03`, `04`, `05`, `06`.

- [x] [08. Bot, Tracking And Integrations](./08-bot-tracking-and-integrations.md)
  Цель: адаптировать bot links, tracking, attribution и внешние интеграции под multi-domain flow.
  Статус: bot URL contracts, cross-domain attribution, tracking relay rules и Stripe/webhook side effects зафиксированы для multi-domain flow.
  Зависимости: `04`, `05`, `06`, `07`.

- [x] [09. Test Plan And Cutover](./09-test-plan-and-cutover.md)
  Цель: определить порядок rollout, smoke/regression checks, cutover и rollback.
  Статус: зафиксированы smoke/regression matrix, rehearsal checklist, staged rollout sequence, go/no-go contract и rollback plan с blocker-условием по legacy production deploy topology.
  Зависимости: `01`–`08`.

## Definition Of Done
Программа считается завершенной, когда:

- новые surfaces `site`, `landing`, `pay` собраны и запускаются независимо
- `api.flirto.guru` является единой browser-facing точкой backend API
- новые домены и маршруты работают в целевой схеме
- старые артефакты не попадают в новые контейнеры и runtime bundle
- bot, tracking и payment flow не теряют attribution при переходах между `lp*`, `pay` и `api`
- deployment и операционные документы обновлены под новую архитектуру

## Historical References
Текущее состояние системы и legacy ограничения описаны в существующих документах:

- [01 Project Overview](../01-project-overview.md)
- [02 Architecture](../02-architecture.md)
- [03 Repository Structure](../03-repository-structure.md)
- [06 Deployment And Environments](../06-deployment-and-environments.md)
- [09 API And Integrations](../09-api-and-integrations.md)
- [10 Frontend Journeys And Routing](../10-frontend-journeys-and-routing.md)
