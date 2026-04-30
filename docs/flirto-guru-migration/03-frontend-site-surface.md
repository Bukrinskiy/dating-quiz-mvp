# 03. Frontend Site Surface

## Goal
Спроектировать новый `frontend-site` container и codebase surface для `flirto.guru`, который будет обслуживать основной брендовый сайт `Flirto Guru`.

## Why
Основной сайт не должен делить app shell, routing и build/runtime assumptions с landing quiz funnel или payment UX. Разделение нужно для:

- чистого брендинга
- независимого контентного развития
- безопасной навигации в landing funnel
- упрощения аналитики и legal routing

## Scope
- Новый `frontend-site` surface
- Routing брендового сайта
- Legal pages для главного сайта
- CTA links в активные landing-и
- Runtime-config и public asset strategy для site surface

## Out of Scope
- Реализация payment UI
- Реализация quiz flow
- Детальная CMS/контентная модель

## Current State
Сейчас основной frontend ориентирован на квиз и открывает первый экран funnel на `/`. Отдельного брендового сайта для `flirto.guru` нет.

## Target State
- `flirto.guru` отдает отдельный frontend surface с собственным routing и layout.
- Site surface не зависит от quiz-specific routing.
- Site surface содержит:
  - home page
  - informational pages
  - legal links
  - CTA на актуальные `lp*` лендинги

## What Must Be Done
- Создать новый `frontend-site` как отдельный build/runtime unit.
- Определить минимальный routing contract для `flirto.guru`.
- Отделить legal routing главного сайта от legacy quiz/legal assumptions.
- Определить, как site surface ссылается на активные landing-и:
  - hardcoded primary LP
  - config-driven primary LP
- Определить branding assets для `Flirto Guru`.

## Implementation Status
Шаг выполнен как `design + scaffold`:

- создан новый независимый surface `frontend-site/`
- surface построен по FSD-слоям:
  - `app`
  - `pages`
  - `widgets`
  - `shared`
- `features` и `entities` не добавлялись искусственно, так как для минимального brand-site v1 они не нужны
- добавлены отдельные runtime/container артефакты:
  - `Dockerfile`
  - `nginx.conf`
  - `runtime-config.js.template`
  - `docker-entrypoint/40-runtime-config.sh`
- добавлен минимальный brand/legal shell без зависимости на `frontend_old/`

## Implementation Notes
- Site surface должен быть максимально простым и не включать funnel-specific bundle logic.
- Если legal content общий для разных surfaces, его лучше вынести в shared content layer, но рендерить через отдельные site/pay/landing shells.
- `frontend-site` не должен импортировать quiz checkout pages и payment widgets.
- CTA links лучше строить от config, а не от зашитого host, чтобы было проще менять primary campaign.
- FSD boundaries для `frontend-site`:
  - `app` может импортировать нижние слои
  - `pages` импортируют `widgets` и `shared`
  - `widgets` не импортируют `pages`
  - `shared` не зависит от верхних слоев
- Для v1 запрещен direct reuse legacy routing/i18n/legal shell из `frontend_old/`; допустим только осознанный перенос отдельных идей или текстов после адаптации.

## Interfaces / Config / Contracts
- Runtime config:
  - `APP_SURFACE=site`
  - `APP_BRAND=Flirto Guru`
  - `API_BASE_URL`
  - `PRIMARY_LANDING_URL`
- Routing contract:
  - `site` обслуживает только брендовые и informational страницы
  - `site` не владеет `checkout`, `pay/success`, `quiz step` routes
- Реализованный routing contract v1:
  - `/` -> redirect на default locale `en`
  - `/en`
  - `/ru`
  - `/en/terms.html`, `/ru/terms.html`
  - `/en/privacy-policy.html`, `/ru/privacy-policy.html`
  - `/en/refund-policy.html`, `/ru/refund-policy.html`
  - все остальные routes остаются внутри site shell и не уводят в quiz flow

## Dependencies
- [01-legacy-freeze-and-old-layout](./01-legacy-freeze-and-old-layout.md)
- [02-target-architecture-and-domain-map](./02-target-architecture-and-domain-map.md)

## Risks
- Попытка reuse legacy app shell приведет к протаскиванию quiz routing на брендовый домен.
- Слишком тесная связка с одним landing host усложнит управление активными кампаниями.

## Validation
- Проверить, что site bundle не содержит checkout/quiz entrypoints.
- Проверить, что legal и CTA routing корректно работают на `flirto.guru`.
- Проверить, что site surface можно деплоить независимо от landing/pay surfaces.
- Проверить, что `frontend-site` не импортирует модули из `frontend_old/`.
- Проверить, что `PRIMARY_LANDING_URL` является единым CTA target для home/header/footer/not-found.

## Acceptance Criteria
- Определен отдельный `frontend-site` surface и его responsibilities.
- Описан минимальный routing contract для `flirto.guru`.
- Определен способ ссылки на активный landing.
- Исключено смешение `site` с `landing` и `pay` app logic.
- Новый surface существует как отдельный каталог и build/runtime unit в репозитории.

## Rollback / Fallback
- До cutover можно временно держать брендовый сайт в минимальной форме.
- Нельзя возвращать главный домен в режим quiz-first SPA после начала миграции, кроме аварийного rollback всего релиза.

## Open Questions
- Для phase 1 принят multilingual routing `ru` + `en` с default locale `en`.
