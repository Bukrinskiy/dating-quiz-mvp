# 09. API and Integrations

## Backend API

### `GET /health`
- Назначение: health-check.
- Ответ: `200` и JSON `{"status": "ok"}`.

### `GET /api/payment/redirect`
- Query: `clickid` (минимум 1 символ).
- Поведение:
  - `422`, если `clickid` пустой на уровне FastAPI validation.
  - `400`, если после sanitization значение пустое (`Invalid clickid`).
  - `503`, если `clickid` валиден (`Payment system is not connected`).
- Фактическая реализация: `backend/app/main.py`.

## API Contract Summary
| Endpoint | Method | Успешный статус | Ошибки (текущие) |
|---|---|---|---|
| `/health` | `GET` | `200` | `TBD` (не описаны явные негативные кейсы) |
| `/api/payment/redirect` | `GET` | `TBD` (интеграция не включена) | `422`, `400`, `503` |

## External Integrations
- Mobi-Slon:
  - Инициализация из `frontend/index.html`.
  - Runtime параметры `VITE_MOBI_SLON_URL`, `VITE_MOBI_SLON_CAMPAIGN_KEY`.
  - Postback логика в `frontend/src/shared/lib/tracking.ts`.
- Facebook Pixel:
  - Инициализация из `frontend/index.html`.
  - Runtime параметр `VITE_FB_PIXEL_ID`.

## Notes по платежам
Переменные `FK_*` присутствуют в `.env.template`, но в текущем backend коде не используются для реального payment flow.

`TBD`:
- Финальный контракт payment redirect (redirect URL, подпись, обработка ошибок провайдера).
- SLA/timeout/retry политика для платежного провайдера.

Как проверить:
1. Сравнить целевой payment flow с продуктовым/бизнес ТЗ.
2. Добавить контрактные тесты для нового поведения endpoint.

См. также: [05-testing-strategy](./05-testing-strategy.md), [06-deployment-and-environments](./06-deployment-and-environments.md).
