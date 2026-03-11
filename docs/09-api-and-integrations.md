# 09. API and Integrations

## Backend API

### `GET /health`
- `200` -> `{"status":"ok"}`.

### `POST /api/payment/checkout-session`
Request:
- `mode`: `one_time | subscription`
- `plan`: `one_time_basic | sub_weekly | sub_monthly | sub_yearly`
- `email`: string
- `clickid`: string
- `locale`: optional string
- `telegram_chat_id`: optional string
- `promo_code`: optional string (subscription only)

Note:
- `locale` (`ru`/`en`) сохраняется в `orders` и используется для language-шаблонов email (access + restore OTP).
- `promo_code` валидируется только на backend; при невалидном/неактивном коде API возвращает `400` с `detail.code=promo_invalid`.

Response:
- `checkout_url`
- `session_id`
- `order_id`

### `POST /api/payment/intent`
Request:
- `plan`: `sub_weekly | sub_monthly | sub_yearly`
- `email`: string
- `clickid`: string
- `locale`: optional string
- `telegram_chat_id`: optional string
- `promo_code`: optional string

Response:
- `order_id`
- `client_secret`
- `customer_id`
- `publishable_key`

### `GET /api/payment/plans`
- Public catalog for `/pay`.
- Optional query:
  - `promo_code`: string (when valid/active, prices are replaced with promo prices).
- Response fields:
  - `code`
  - `headline`
  - `billing_period`
  - `interval_unit`
  - `interval_count`
  - `price { amount_minor, currency }`
  - `compare_at_price { amount_minor, currency } | null`
  - `per_day_price { amount_minor, currency } | null`
  - `badge`
  - `is_default`
  - `is_highlighted`
- Catalog and merchandising are fully backend-configured through env vars.
- Если `promo_code` невалиден/неактивен -> `400` + `{"detail":{"code":"promo_invalid","message":"..."}}`.

### Promo offers storage
- Table: `seranking.promo_offers`
  - `code` (unique, uppercase), `is_active`
  - `currency`
  - `sub_weekly_amount_minor`, `sub_monthly_amount_minor`, `sub_yearly_amount_minor`
  - `created_at`, `updated_at`
- Applied promo code is stored in `seranking.orders.promo_code`.

### How to create an individual promo offer
```sql
INSERT INTO seranking.promo_offers (
  id,
  code,
  is_active,
  currency,
  sub_weekly_amount_minor,
  sub_monthly_amount_minor,
  sub_yearly_amount_minor,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'VIP2026A',
  true,
  'usd',
  199,
  3900,
  9900,
  now(),
  now()
);
```

### `POST /api/stripe/webhook`
- Проверка подписи `stripe-signature` + `STRIPE_WEBHOOK_SECRET`.
- Идемпотентность через таблицу `payment_events` (`stripe_event_id` unique).

### `GET /api/payment/session-status?session_id=...`
- `payment_status`
- `fulfillment_status`
- `access_status`
- `activation_link` (если выдан token)

### `GET /api/payment/order-status?order_id=...`
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
- Для `status=pay_email_entered` frontend передает `tracking_params.email` (PII), и значение попадает в relay/logs.

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
- `pay_email_entered`
- `pay_plan_weekly_selected`
- `pay_plan_monthly_selected`
- `pay_plan_yearly_selected`
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

### `POST /api/bot/session/start`
- Request: `telegram_user_id`, `mode(write_now|analyze_case)`
- Response: `session_id`, `mode`, `state`, `next_step`
- Behavior: закрывает предыдущую active-сессию пользователя.

### `POST /api/bot/session/{session_id}/asset`
- Request: `telegram_user_id`, `asset_type(text|forward|image|audio)`, `payload`, optional `telegram_message_id`
- Response: `session_id`, `asset_id`, `state`, `needs_confirmation`, `summary_for_user`
- Для `image/audio` обязательны `payload.media.mime_type` и `payload.media.content_base64`.

### `POST /api/bot/session/{session_id}/batch/close`
- Request: `telegram_user_id`
- Response: `session_id`, `state`, `needs_confirmation`, `context_preview`

### `POST /api/bot/session/{session_id}/confirm-context`
- Request: `telegram_user_id`, `action(confirm:yes|confirm:edit)`, optional `edit_text`
- Response: `session_id`, `state`, `confirmed`

### `POST /api/bot/session/{session_id}/generate`
- Request: `telegram_user_id`, optional `scenario/tone/constraints/tried_actions/target_outcome`
- Response: `session_id`, `mode`, `state`, `next_step`, `llm_provider`, `model_name`, `ui_payload`

### `POST /api/bot/session/{session_id}/refine`
- Request: `telegram_user_id`, `command`
- Response: generation payload + legacy fields (`primary_message`, `why`, `fallback_simple_version`, `next_step`, `alternatives`)

### `POST /api/bot/session/{session_id}/reset`
- Request: `telegram_user_id`
- Response: `session_id`, `status=closed`

### `POST /api/bot/media/transcribe`
- Request: `asset_type(audio|image)` + `payload.media` (`mime_type`, `content_base64`, optional `file_name`)
- Response: `text`

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
