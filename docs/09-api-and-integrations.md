# 09. API and Integrations

## Backend API

### `GET /health`
- `200` -> `{"status":"ok"}`.

### `POST /api/payment/checkout-session`
Request:
- `mode`: `one_time | subscription`
- `plan`: `one_time_basic | sub_monthly`
- `email`: string
- `clickid`: string
- `locale`: optional string
- `telegram_chat_id`: optional string

Note:
- `locale` (`ru`/`en`) сохраняется в `orders` и используется для language-шаблонов email (access + restore OTP).

Response:
- `checkout_url`
- `session_id`
- `order_id`

### `POST /api/stripe/webhook`
- Проверка подписи `stripe-signature` + `STRIPE_WEBHOOK_SECRET`.
- Идемпотентность через таблицу `payment_events` (`stripe_event_id` unique).

### `GET /api/payment/session-status?session_id=...`
- `payment_status`
- `fulfillment_status`
- `access_status`
- `activation_link` (если выдан token)

### `POST /api/payment/customer-portal`
- Request: `email`
- Response: `portal_url`

### `POST /api/access/activate`
- Request: `activation_token`, `telegram_user_id`
- One-time активация доступа.

### `POST /api/auth/restore/request`
- Request: `email`
- Генерация OTP и отправка на email по SMTP (`otp_delivery_sent`).

### `POST /api/auth/restore/confirm`
- Request: `email`, `otp`, `telegram_user_id?`
- Проверка OTP, ротация токена, опциональная активация доступа.

### `GET /api/tracking/meta-event`
- Public endpoint without authorization.
- Query params:
  - `status` (required)
  - `fbclid`, `ip`, `ua` (optional)
- Sends event to Meta Conversions API with:
  - `event_name=status`
  - `event_time=now`
  - `action_source=website`
  - `user_data.fbc/client_ip_address/client_user_agent`
- Config: `META_PIXEL_ID`, `META_ACCESS_TOKEN`, optional `META_GRAPH_API_VERSION` (default `v18.0`).

### `POST /api/tracking/mobi-slon-event`
- Public relay endpoint for frontend.
- Request: `status`, `clickid`, optional `session_id`, `page_path`, `tracking_params`.
- Backend validates payload, logs relay attempt, forwards to MobiSлон with retries.

MobiSлон event names (enum reference):
- `start_quiz`
- `block1_completed`
- `block2_completed`
- `block3_completed`
- `block4_completed`
- `block5_completed`
- `block6_completed`
- `block7_completed`
- `transition_to_payment`
- `pay_success`

### `GET /api/tracking/mobi-slon-event`
- Fallback relay endpoint for beacon/image transport.
- Query: `status`, `clickid`, optional `session_id`, `page_path`, plus any tracking params.

### Internal bot endpoints (service-to-service)
Все endpoints ниже требуют header `X-Internal-Token`.

### `POST /api/bot/access/status`
- Request: `telegram_user_id`
- Response: `is_paid`, `order_id`, `plan`, `access_status`

### `POST /api/bot/access/activate`
- Request: `activation_token`, `telegram_user_id`
- Response: `access_granted` + order payload

### `POST /api/bot/restore/request`
- Request: `email`
- Response: `status=otp_logged`

### `POST /api/bot/restore/confirm`
- Request: `email`, `otp`, `telegram_user_id`
- Response: `status`, `activation_link`, `access_granted`

### Legacy
### `GET /api/payment/redirect`
- `410 Gone`.

## External Integrations
- Stripe Checkout + Webhook
- Telegram Bot API (aiogram bot service)
- Gmail SMTP (`smtp.gmail.com:587`, STARTTLS)
- MobiSлон postback (all funnel events are relayed through backend `/api/tracking/mobi-slon-event`; `pay_success` is additionally sent from Stripe webhook using `order.clickid`)

## Telegram Bot modes
- Local: `BOT_MODE=polling`
- Prod: `BOT_MODE=webhook`, webhook URL `https://<domain>/tg/webhook/<secret>`

## Telegram bot payment link config
- `BOT_PAY_URL`: явная ссылка на страницу оплаты в боте.
- Если `BOT_PAY_URL` пустой, бот использует fallback `${APP_PUBLIC_BASE_URL}/pay`.
- При неактивном доступе (`is_paid=false`, в т.ч. `pending`, `token_issued`, `expired`, `revoked`) middleware и `/start` отвечают сообщением с кнопкой `Оплатить доступ`.
