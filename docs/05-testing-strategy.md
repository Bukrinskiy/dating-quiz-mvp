# 05. Testing Strategy

## Backend tests
Текущие тесты покрывают:
- legacy endpoint (`410`)
- checkout session для `one_time` и `subscription`
- webhook идемпотентность
- статус оплаты после webhook
- restore flow (request + invalid OTP)
- internal bot API auth (`X-Internal-Token`)
- bot access status (`paid/unpaid`) после активации
- manual access grants (`grant/revoke`, expiry, entitlement merge с paid access)

Команды:
- `make test-backend`
- `make test-backend-local`

## Manual smoke
1. `make up`
2. `GET /health` -> `200`
3. `POST /api/payment/checkout-session`
4. Stripe webhook в `POST /api/stripe/webhook`
5. `GET /api/payment/session-status`
6. `site`: `/en`
7. `landing`: `/en/quiz/1`, `/en/quiz/15`, `/en/quiz/26`, `/en/quiz/email/:uuid`
8. `pay`: `/en/checkout/:uuid`, `/en/pay/success`, `/en/pay/cancel`, `/en/pay/manage`
9. compatibility redirect: `/ru/...` и `/:lang/quiz/checkout/:uuid` должны вести на английский canonical route с сохранением query params
10. preflight/browser calls из `site`, `landing` и `pay` в `API_PUBLIC_BASE_URL`
11. Telegram: `/start <token>` -> `/premium` доступен
12. Telegram: `/restore` (FSM email -> OTP)
13. Telegram admin: `/create_promo_code`
14. Telegram admin: `/create_promo_code_until` -> `YYYY-MM-DD`

## Security checks
- invalid webhook signature -> `400`
- webhook replay -> duplicate=true
- restore rate limit -> `429`
- bot internal auth missing/invalid token -> `401`
- admin команды в боте для не-админа -> deny

## Bot guided-flow tests (v1)
Автотесты backend дополнительно покрывают:
- auth guard для новых internal endpoint'ов (`/api/bot/session/*`, `/api/bot/media/transcribe`)
- lifecycle сессии: `start -> asset(text) -> batch/close -> generate -> refine -> reset`
- schema/contract проверки response payload для `generate/refine`

Manual smoke для бота (paid user):
1. `/start <token>` -> доступ активирован.
2. `/advice` -> выбрать режим.
3. Отправить текст, фото и voice/audio.
4. `Готово` -> при необходимости пройти confirm-context.
5. Получить `generate` результат, выполнить минимум 1 `refine`.
6. `/reset` или `Завершить` -> сессия закрыта.

Manual smoke для promo access:
1. Админ в Telegram вызывает `/create_promo_code` или `/create_promo_code_until`.
2. Пользователь логинится в `app.flirto.guru`, вводит код в `/app/profile`.
3. `GET /api/app/access-status` и UI profile/paywall показывают `Promo`.
4. После истечения срока `GET /api/app/access-status` возвращает `Inactive`.
