# 11. Troubleshooting

## Проблема: frontend не открывается
Проверки:
1. `make ps` — контейнер frontend должен быть `Up`.
2. Проверить порт `FRONTEND_PORT` в `.env`.
3. `make logs-frontend` — проверить ошибки Nginx/runtime-config.

## Проблема: backend недоступен
Проверки:
1. `make logs-backend`.
2. `curl http://localhost:8000/health`.
3. Для dev-режима: `make dev-logs`.

## Проблема: `/api/payment/redirect` возвращает 503
Это ожидаемое текущие поведение.
- Сообщение: `Payment system is not connected`.
- Проверка тестом: `make test-backend`.

## Проблема: tracking не срабатывает
Проверки:
1. Убедиться, что заданы `VITE_*` переменные.
2. Проверить `runtime-config.js` в frontend контейнере (должен быть с подставленными значениями).
3. Включить `VITE_TRACKING_DEBUG=true` и проверить console-логи.

## Проблема: `/api` не проксируется в локальном frontend dev
Проверки:
1. Запущен backend (`make dev-up` или локально на `8000`).
2. В `frontend/vite.config.ts` proxy target: `VITE_API_PROXY_TARGET` или default `http://localhost:8000`.

## Проблема: конфликты между SPA и legacy HTML
Симптом:
- Разные страницы по одинаковым бизнес-сценариям.

Действие:
- Для активной разработки использовать `frontend/` и SPA маршруты.
- Legacy файлы считать архивным/совместимым слоем до решения по деактивации.

См. также: [03-repository-structure](./03-repository-structure.md), [08-observability-and-operations](./08-observability-and-operations.md).
