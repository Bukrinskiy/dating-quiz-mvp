# 04. Frontend Landing Platform

## Status
Шаг завершен.

- Создан отдельный `frontend-landing/` surface.
- Реализована FSD-структура (`app`, `pages`, `features`, `entities`, `shared`).
- Введен static host-based manifest resolver.
- Quiz и email flow перенесены в новый surface.
- Checkout ownership удален из landing surface; после email выполняется handoff в `pay.flirto.guru`.
- Все browser API calls нового landing surface используют `API_BASE_URL`, а не same-origin `/api`.

## Goal
Спроектировать и реализовать новый `frontend-landing` surface для `lp*.flirto.guru`, который поддерживает host-based campaign manifests и в фазе 1 реализует только `quiz` experience.

## Why
Landing-и будут жить на отдельных поддоменах и должны быть готовы к расширению по кампаниям, но без лишней сложности в первой фазе. Нужна структура, которая:

- не привязывает все будущее к одному hardcoded `lp1`
- не требует отдельный container на каждый LP
- не заставляет прямо сейчас делать non-quiz renderers

## Scope
- `frontend-landing` как отдельный surface
- Host-based manifest model
- Quiz-only v1
- Landing routing, copy/assets/theme selection
- Handoff contract в `pay.flirto.guru`

## Out of Scope
- Реализация non-quiz landing types
- Отдельные containers для каждого `lpN`
- Управление manifest-ами через CMS

## Current State
Legacy frontend совмещает acquisition funnel и payment UI в одном SPA. Понятия host-based campaign routing нет.

## Target State
- Один `frontend-landing` container обслуживает все `lp*.flirto.guru`.
- Host определяет, какой manifest кампании должен быть загружен.
- В фазе 1 каждый manifest использует только `quiz` experience.
- Landing surface отвечает за:
  - quiz steps
  - email/session creation
  - переход в `pay.flirto.guru`

## Implemented Shape
- Root directory: `frontend-landing/`
- Runtime contract:
  - `APP_SURFACE=landing`
  - `API_BASE_URL`
  - `PAY_PUBLIC_BASE_URL`
- Manifest storage: static TypeScript manifests в `src/entities/landing-manifest/`
- Resolver behavior: strict allowlist, неизвестный host получает landing not found
- Route ownership:
  - owned: `/:lang/quiz`, `/:lang/quiz/:step`, `/:lang/quiz/email/:uuid`, localized legal routes
  - not owned: `checkout`, `pay/success`, `pay/cancel`, `pay/manage`
- Handoff contract:
  - landing сохраняет email через backend session API
  - затем делает redirect в `pay` на path `/:lang/quiz/checkout/:uuid`
  - в query сохраняются tracking params, `session_id`, `landing_id`, `lang`

## FSD Notes
- `app` отвечает за bootstrap, router и host gate.
- `entities/landing-manifest` владеет manifest contract и resolver.
- `entities/quiz-session` владеет browser session API calls.
- `features/handoff-to-pay` владеет redirect URL contract.
- `pages` содержат route-level composition для quiz, email, legal, not-found.
- Код из legacy переносится только как адаптированные модули внутри нового surface; прямой runtime/build import из `frontend_old/` отсутствует.

## What Must Be Done
- Ввести manifest contract для landing campaigns.
- Ввести host-to-manifest resolution.
- Определить quiz-only routing contract для v1.
- Определить, какие данные manifest управляет:
  - `landing_id`
  - `host`
  - `default_locale`
  - `theme`
  - `copy_set`
  - `asset_set`
  - `enabled_routes`
  - `payment_handoff_mode`
- Определить handoff contract в `pay`.

## Implementation Notes
- Не нужно реализовывать `lead` или `content` сейчас.
- Но naming и структура должны быть neutral:
  - `landing manifest`, а не `quiz manifest`
  - `campaign resolver`, а не `lp1 resolver`
- В v1 допустимо иметь один manifest `lp1`, но resolver должен быть рассчитан на несколько host values.
- Quiz renderer можно строить на базе текущей логики, но перенос должен идти в новый surface, а не через зависимость на legacy frontend.

## Interfaces / Config / Contracts
- Runtime config:
  - `APP_SURFACE=landing`
  - `API_BASE_URL`
  - `PAY_PUBLIC_BASE_URL`
- Manifest contract:
  - `landing_id`
  - `host`
  - `default_locale`
  - `experience_type=quiz`
  - `enabled_routes`
  - `theme`
  - `copy_set`
  - `asset_set`
  - `payment_handoff_mode=redirect_to_pay`
- Routing contract v1:
  - quiz step routes
  - email/session routes
  - no final payment ownership

## Dependencies
- [01-legacy-freeze-and-old-layout](./01-legacy-freeze-and-old-layout.md)
- [02-target-architecture-and-domain-map](./02-target-architecture-and-domain-map.md)

## Risks
- Слишком узкая `quiz-only` архитектура заблокирует будущие кампании.
- Слишком абстрактная платформа в фазе 1 приведет к ненужной сложности.
- Нечеткий handoff contract сломает attribution между landing и pay.

## Validation
- Проверить, что один landing container может отдать разные manifests по host.
- Проверить, что quiz flow не содержит встроенной логики финального checkout на landing surface.
- Проверить, что naming и config не зашиты на `lp1` как на единственный вечный вариант.
- Проверить `pnpm test`, `pnpm lint`, `pnpm build` в `frontend-landing/`.

## Acceptance Criteria
- Описан новый `frontend-landing` surface.
- Зафиксирован host-based manifest подход.
- Явно указано, что в фазе 1 реализуется только `quiz` experience.
- Зафиксирован handoff в `pay.flirto.guru`.
- Реализация находится в `frontend-landing/` и проходит локальные `test`, `lint`, `build`.

## Rollback / Fallback
- Если manifest layer окажется слишком тяжелым для первого шага, допускается временный hardcoded mapping `lp1 -> manifest`.
- При этом структура файлов и naming должны оставаться platform-friendly, чтобы не пришлось переписывать surface заново.

## Decisions
- В v1 используется strict allowlist для host resolution.
- Manifest-ы хранятся в static TypeScript, без runtime JSON и без backend-driven CMS layer.
- Landing не владеет checkout route даже как transitional inline page.
