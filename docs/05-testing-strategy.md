# 05. Testing Strategy

## Цели тестирования
- Подтвердить корректность критичных API-контрактов backend.
- Предотвратить регрессии в маршрутизации и пользовательском потоке frontend.
- Проверять соответствие runtime-конфигурации окружениям.

## Backend Tests
Текущие тесты (`backend/tests/test_payment_redirect.py`) проверяют:
- `503` для `/api/payment/redirect?clickid=test123`.
- `422` для пустого `clickid`.
- `400` для невалидного `clickid` после sanitization.

Команды:
- `make test-backend`
- `make test-backend-local`

## Frontend Smoke (ручной)
Минимальный smoke после изменений UI/роутинга:
1. Открыть `/`.
2. Пройти `/block-1` ... `/block-7`.
3. Проверить `/pay` (ожидаемо показывает недоступность оплаты).
4. Проверить `/terms.html`, `/privacy-policy.html`, `/refund-policy.html`.
5. Проверить, что query-параметры (`clickid` и др.) пробрасываются по ссылкам воронки.

## Integration/Runtime Smoke
- `make up`
- Проверка:
  - `GET /health` -> `{"status": "ok"}`
  - `GET /api/payment/redirect?clickid=test123` -> `503 Payment system is not connected`

## Gaps / TBD
| Область | Текущий статус | TBD |
|---|---|---|
| Frontend unit/e2e | Формальных тестов не обнаружено | Определить стек (например Playwright/Vitest) и покрыть критический маршрут квиза |
| Contract tests frontend-backend | Нет | Добавить API contract smoke для `/api/payment/redirect` |
| CI quality gates | Явная CI-конфигурация в репо не обнаружена | Зафиксировать обязательные проверки в CI и protected branch policy |

См. также: [11-troubleshooting](./11-troubleshooting.md), [12-glossary-and-decisions](./12-glossary-and-decisions.md).
