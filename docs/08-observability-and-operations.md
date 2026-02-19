# 08. Observability and Operations

## Runtime checks
Базовые проверки доступности:
- Frontend: `GET /` (HTTP 200, загрузка SPA).
- Backend: `GET /health` -> `{"status":"ok"}`.
- Payment API: `GET /api/payment/redirect?clickid=test123` -> ожидаемо `503`.

## Operational commands
- `make ps` — статус контейнеров.
- `make logs` — общие логи.
- `make logs-frontend` — логи frontend.
- `make logs-backend` — логи backend.
- `make dev-logs` / `make dev-logs-backend` — dev backend.

## Tracking diagnostics
Frontend содержит диагностический логгер (`frontend/src/shared/lib/trackingLogger.ts`) и флаг `VITE_TRACKING_DEBUG`.

Практика:
- Для отладки включать `VITE_TRACKING_DEBUG=true`.
- Для production по умолчанию держать `false`, если нет активного расследования.

## Incidents (MVP runbook)
1. Проверить контейнеры `make ps`.
2. Проверить backend health `curl http://localhost:8000/health`.
3. Проверить frontend endpoint `curl -I http://localhost/`.
4. Проверить логи `make logs-backend` и `make logs-frontend`.
5. Если проблема в payment, помнить что `503` сейчас штатное поведение.

## Monitoring gaps / TBD
- Нет формализованных SLI/SLO.
- Нет описанных алертов и внешней APM-интеграции.
- Нет структурированного error budget процесса.

Как проверить и закрыть:
- Зафиксировать целевые SLI/SLO по availability/latency.
- Подключить централизованный сбор логов и метрик.
- Добавить alert routing и on-call policy.

См. также: [11-troubleshooting](./11-troubleshooting.md).
