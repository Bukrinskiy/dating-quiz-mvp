# 12. Glossary and Decisions

## Glossary
- `SPA`: Single Page Application в `frontend/`.
- `Legacy static flow`: корневые `index.html`, `blocks/*.html`, `assets/*`.
- `Prod-like compose`: `docker-compose.yml` с image pull.
- `Dev compose`: `docker-compose.dev.yml` для backend reload.
- `Runtime config`: `runtime-config.js`, генерируемый при старте frontend контейнера.

## Architecture Decisions (current)
1. **Сохранение URL юридических страниц в формате `.html`**
   - Причина: совместимость существующих ссылок и рекламных материалов.
   - Реализация: маршруты SPA `/terms.html`, `/privacy-policy.html`, `/refund-policy.html`.

2. **Runtime injection для tracking-переменных**
   - Причина: менять tracking-конфиг без пересборки frontend image.
   - Реализация: `runtime-config.js.template` + `40-runtime-config.sh` + `window.__APP_CONFIG__`.

3. **Payment endpoint в режиме заглушки**
   - Причина: неполная интеграция платежной системы на текущем этапе.
   - Реализация: `503 Payment system is not connected`.

## Risks / Open Questions / TBD
| Категория | Описание | Влияние | Статус | Как проверить/закрыть |
|---|---|---|---|---|
| Product/Payment | Финальный payment-flow и контракт redirect не зафиксирован в коде | Высокое | `TBD` | Утвердить контракт, реализовать backend, покрыть тестами |
| Architecture | Дублирование SPA и legacy статических страниц | Среднее | `Open` | Принять решение: миграция/архивация legacy |
| Security | Нет формализованной compliance-политики в репо | Среднее | `TBD` | Описать policy и добавить review checklist |
| Operations | Нет явных SLI/SLO и alerting-процесса | Среднее | `TBD` | Добавить метрики, алерты, on-call runbook |
| Delivery | `make deploy` не содержит health-gate/rollback-автоматику | Среднее | `TBD` | Добавить post-deploy проверки и rollback сценарий |
| QA | Frontend e2e/автотесты не обнаружены | Среднее | `TBD` | Добавить тестовый стек и минимальный smoke suite |

## Change log policy for docs
- При закрытии любого `TBD` обновлять соответствующий документ и этот реестр рисков.
- Если решение меняет архитектурный принцип, добавить новый пункт в этот файл.

См. также: [AGENTS.md](../AGENTS.md), [04-development-workflow](./04-development-workflow.md).
