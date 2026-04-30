# 01. Legacy Freeze And `*_old` Layout

## Goal
Зафиксировать безопасную стратегию миграции, при которой текущая monolithic frontend/runtime структура перестает быть source of truth, переименовывается в `*_old`, а новые surfaces создаются отдельно.

## Why
Текущий проект содержит накопленные runtime/build assumptions под single-SPA и single-domain модель. Если использовать эти директории как основу новой архитектуры, высок риск протащить:

- лишние маршруты и старые alias
- устаревшие Nginx proxy rules
- старые runtime-config шаблоны
- случайные статические артефакты и ассеты
- неправильные absolute URL assumptions для `pay` и `api`

Стратегия `*_old` дает контролируемую миграцию и упрощает ревью новых контейнеров.

## Scope
- Определение списка legacy директорий и файловых зон
- Правила их переименования в `*_old`
- Правила reuse старых исходников и артефактов
- Правила для новых build contexts и новых контейнеров

## Out of Scope
- Фактическая реализация новых frontend surfaces
- Фактическое удаление legacy кода после cutover
- Перенос бизнес-логики backend

## Current State
По текущей документации и структуре репозитория:

- есть один основной frontend SPA в legacy структуре
- container runtime предполагает один frontend surface
- `nginx.conf`, `runtime-config.js.template` и docker entrypoint заточены под single frontend
- routing ориентирован на `/:lang/quiz/*` и внутренний payment UX
- в репозитории уже есть build artifacts и legacy/static leftovers
- в рамках шага `01` legacy frontend surface уже переименован в `frontend_old/`

См. также:

- [02 Architecture](../02-architecture.md)
- [03 Repository Structure](../03-repository-structure.md)

## Target State
- Все legacy директории, используемые как reference для старой архитектуры, явно помечены как `*_old`.
- Новые surfaces используют только новые каталоги и новые Dockerfile/runtime entrypoints.
- Любое копирование из `*_old` выполняется адресно и после ревью.
- CI, compose и deploy не зависят от старых директорий как от active source paths.
- Root-level leftovers (`assets/`, `blocks/`, root html/media и подобные артефакты) зафиксированы как legacy, но не переименовываются в этом шаге.

## What Must Be Done
- Составить и утвердить список директорий, относящихся к legacy monolith flow.
- Переименовать текущий frontend surface `frontend/` в `frontend_old/`.
- В существующих build/runtime references и документах использовать `frontend_old/` как legacy reference path.
- Явно запретить reuse следующих категорий без адаптации:
  - Dockerfile
  - Nginx config
  - runtime-config templates
  - entrypoint scripts
  - dist/build artifacts
- Для shared code определить отдельную политику:
  - чистые utility modules и контент можно переносить адресно
  - runtime glue не переносится без полной проверки

## Implementation Notes
- Для frontend surfaces лучше сразу завести новые root directories, а не создавать nested подпапки внутри legacy frontend.
- Если часть UI, i18n или assets переносится, перенос должен идти как copy-and-adapt, а не как implicit dependency на `*_old`.
- Любые старые `dist`, generated bundles и промежуточные артефакты должны быть исключены из новых build contexts.
- В naming policy важно сохранить читаемость: `frontend_old` предпочтительнее скрытого archive-пути, потому что migration status виден сразу.
- Минимальный фактический rename scope шага `01`: только `frontend/` -> `frontend_old/`; root-level leftovers пока остаются на месте, но считаются legacy.

## Interfaces / Config / Contracts
- Naming contract:
  - legacy active path -> `*_old`
  - new active path -> без `_old`
- Step `01` naming baseline:
  - `frontend/` -> `frontend_old/`
- Build contract:
  - текущие legacy build/dev flows продолжают ссылаться только на `frontend_old/*`
  - каждый новый container использует только новый build context
- Reuse contract:
  - shared code допускается к переносу только через явный import/copy в новые каталоги
  - прямые runtime references на `*_old` запрещены
  - root-level leftovers нельзя использовать как build context или runtime dependency без явного переноса в новый surface

## Dependencies
- Нет обязательных зависимостей; это стартовая задача программы.

## Risks
- Слишком раннее удаление legacy paths усложнит сверку поведения.
- Неполный список legacy директорий приведет к скрытому reuse старых артефактов.
- Переименование без последующего обновления docs/deploy может временно сломать существующие локальные команды.

## Validation
- Проверить, что после переименования legacy активные build/dev references ведут на `frontend_old/*`, а не на `frontend/*`.
- Проверить, что новые Dockerfile и compose services не читают файлы из `*_old`.
- Проверить, что migration docs фиксируют explicit reuse policy.

## Acceptance Criteria
- Список legacy директорий и их целевые `*_old` имена зафиксирован.
- `frontend/` переименован в `frontend_old/`, а существующие build/runtime references обновлены.
- Новые active directories определены отдельно от legacy.
- Политика reuse старых исходников и runtime artifacts описана недвусмысленно.
- Все последующие migration tasks опираются на эту стратегию как на базовую.

## Rollback / Fallback
- Если переименование блокирует разработку, допустим временный alias-слой или локальный compatibility branch.
- Legacy директории не удаляются в фазе 1, поэтому rollback состоит в возврате ссылок на прежние пути до cutover.

## Open Questions
- Какие конкретные root-level leftovers, кроме уже зафиксированного `frontend_old/`, нужно будет переименовать или удалить в следующих шагах миграции.
