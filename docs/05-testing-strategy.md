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

Команды:
- `make test-backend`
- `make test-backend-local`

## Manual smoke
1. `make up`
2. `GET /health` -> `200`
3. `POST /api/payment/checkout-session`
4. Stripe webhook в `POST /api/stripe/webhook`
5. `GET /api/payment/session-status`
6. `/pay`, `/pay/success`, `/pay/cancel`, `/pay/manage`
7. Telegram: `/start <token>` -> `/premium` доступен
8. Telegram: `/restore` (FSM email -> OTP)

## Security checks
- invalid webhook signature -> `400`
- webhook replay -> duplicate=true
- restore rate limit -> `429`
- bot internal auth missing/invalid token -> `401`
