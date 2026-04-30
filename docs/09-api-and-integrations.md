# 09. API and Integrations

## Backend API

Browser-facing API origin for new surfaces: `API_PUBLIC_BASE_URL` (`https://api.flirto.guru` in target production topology).

### `GET /health`
- `200` -> `{"status":"ok"}`.

### `POST /api/payment/checkout-session`
Request:
- `mode`: `one_time | subscription`
- `plan`: `one_time_basic | sub_weekly | sub_monthly | sub_quarterly | sub_yearly`
- `email`: string
- `clickid`: string
- `locale`: optional string
- `telegram_chat_id`: optional string
- `promo_code`: optional string (subscription only)
- `brand`: optional string
- `landing_id`: optional string
- `entry_host`: optional string
- `entry_path`: optional string

Note:
- `locale` (`ru`/`en`) сохраняется в `orders` и используется для language-шаблонов email (access + restore OTP).
- frontend surfaces строят canonical public URLs только с `en`; старые `ru` URL сохраняются как compatibility redirect на соответствующий `/en/...`.
- `promo_code` валидируется только на backend; при невалидном/неактивном коде API возвращает `400` с `detail.code=promo_invalid`.
- Success/cancel URLs для Stripe backend строит от `PAY_PUBLIC_BASE_URL`.

Response:
- `checkout_url`
- `session_id`
- `order_id`

### `POST /api/payment/intent`
Request:
- `plan`: `sub_weekly | sub_monthly | sub_quarterly | sub_yearly`
- `email`: string
- `clickid`: string
- `locale`: optional string
- `telegram_chat_id`: optional string
- `promo_code`: optional string
- `brand`: optional string
- `landing_id`: optional string
- `entry_host`: optional string
- `entry_path`: optional string

Response:
- `order_id`
- `client_secret`
- `customer_id`
- `publishable_key`

### `GET /api/payment/plans`
- Public catalog for canonical pay route `/en/checkout/:uuid` (`ru` prefixed routes and legacy alias `/:lang/quiz/checkout/:uuid` only redirect there).
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
- Table: `flirto_guru.promo_offers`
  - `code` (unique, uppercase), `is_active`
  - `currency`
  - `sub_weekly_amount_minor`, `sub_monthly_amount_minor`, `sub_yearly_amount_minor`
  - `created_at`, `updated_at`
- Для `sub_quarterly` в текущей схеме применяется `sub_yearly_amount_minor` из promo-таблицы.
- Applied promo code is stored in `flirto_guru.orders.promo_code`.

### How to create an individual promo offer
```sql
INSERT INTO flirto_guru.promo_offers (
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
- Stripe portal `return_url` backend строит от `PAY_PUBLIC_BASE_URL/:lang/pay/manage`; frontend canonical route использует `/en/pay/manage`.

### `POST /api/session/create`
- Request:
  - `locale`, `currency`, optional `clickid`
  - `brand`, `landing_id`, `entry_host`, `entry_path`
  - `tracking_params`
  - `answers`
- Response: `uuid`
- Behavior:
  - сохраняет quiz session в `flirto_guru.quiz_sessions`
  - attribution fields используются как source of truth для последующего handoff в pay/order flow
  - handoff contract для `landing -> pay -> api` включает `clickid`, `bcid`, `landing_id`, `entry_host`, `entry_path`, `lang`, `session_id`, `tracking_params`; frontend отправляет canonical `lang=en`

### `POST /api/session/update-email`
- Request: `uuid`, `email`
- Response: `{"ok": true}`

### `POST /api/session/get-plan-data`
- Request: `uuid`, optional `promo_code`
- Response: `uuid`, `locale`, `currency`, `email`, `plans`

### `POST /api/session/create-payment-intent`
- Request:
  - `uuid`, `plan`, `email`
  - optional `clickid`, `locale`, `telegram_chat_id`, `promo_code`
  - optional `brand`, `landing_id`, `entry_host`, `entry_path`
- Response:
  - `order_id`
  - `client_secret`
  - `customer_id`
  - `publishable_key`
- Behavior:
  - переносит attribution из `quiz_sessions` в `orders`
  - optional attribution override допускается, но session остается primary source of truth
  - pay frontend прокидывает canonical attribution query (`clickid`, `landing_id`, `entry_host`, `entry_path`) как override, но backend по-прежнему считает session primary source of truth
  - canonical consumer этого контракта: `/en/checkout/:uuid`

### `POST /api/access/activate`
- Request: `activation_token`, `telegram_user_id`
- One-time активация доступа.

### `POST /api/auth/restore/request`
- Request: `email`
- Генерация OTP и отправка на email по SMTP (`otp_delivery_sent`).

### `POST /api/auth/restore/confirm`
- Request: `email`, `otp`, `telegram_user_id?`
- Проверка OTP, ротация токена, опциональная активация доступа.

### `POST /api/app/auth/email-code/request`
- Request: `email`
- Отправляет login code для PWA `app.flirto.guru`.

### `POST /api/app/auth/email-code/confirm`
- Request: `email`, `code`
- Создает `app_user`, выдает `access_token` в JSON и `refresh` в httpOnly cookie.
- Дополнительно возвращает shared entitlement status по email.

### `POST /api/app/auth/refresh`
- Request body отсутствует; refresh берется из httpOnly cookie.
- Ротирует refresh session, возвращает новый `access_token` и обновляет cookie.

### `POST /api/app/auth/logout`
- Инвалидирует текущий refresh session и очищает refresh cookie.

### `GET /api/app/auth/me`
- Bearer auth.
- Response: `user`, `tokens.expires_in`, `access`.

### `GET /api/app/access-status`
- Bearer auth.
- Возвращает shared entitlement по email из existing `orders` + active `manual_access_grants`.

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
- Backend validates payload, logs relay attempt, and forwards frontend events to MobiSлон in at-most-once mode without upstream retries.
- `frontend-pay` использует только backend relay; прямой browser pixel/postback на upstream Mobi-Slon из pay больше не выполняется.
- Для `status=pay_email_entered` frontend передает `tracking_params.email` (PII), и значение попадает в relay/logs.
- `pay_success` не должен приходить из browser/frontend: этот статус зарезервирован для server-side отправки из Stripe webhook после подтвержденной оплаты.

MobiSлон event names (enum reference):
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

Note:
- `pay_success` присутствует в enum для server-side webhook postback, а не как разрешенный browser-owned terminal event.

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

### `POST /api/bot/admin/access/grant`
- Internal endpoint под `X-Internal-Token`.
- Request: `email`, `expires_at`, `admin_telegram_user_id`, optional `admin_telegram_username`
- Создает новый `manual_access_grant` по email.
- Если для email уже был active manual grant, старый grant ревокается с `replaced_by_new_grant`.

### `POST /api/bot/admin/access/revoke`
- Internal endpoint под `X-Internal-Token`.
- Request: `email`, `admin_telegram_user_id`, optional `admin_telegram_username`
- Ревокает только manual grant и не отключает existing paid/subscription entitlement.

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

### Public app guided-session endpoints
- Все endpoints ниже требуют Bearer `access_token` и active entitlement.
- `POST /api/app/session/start`
- `GET /api/app/sessions`
- `GET /api/app/session/{session_id}`
- `POST /api/app/session/{session_id}/asset-text`
- `POST /api/app/session/{session_id}/asset-image`
- `POST /api/app/session/{session_id}/asset-audio`
- `POST /api/app/session/{session_id}/batch/close`
- `POST /api/app/session/{session_id}/confirm-context`
- `POST /api/app/session/{session_id}/generate`
- `POST /api/app/session/{session_id}/refine`
- `POST /api/app/session/{session_id}/reset`
- `POST /api/app/session/reset-active`
- `GET /api/app/sessions` возвращает recent/history список app sessions пользователя с `mode`, `status`, `state`, timestamps и preview.
- `GET /api/app/session/{session_id}` возвращает hydrate snapshot session: messages, `context_preview`, последний `ui_payload` и флаг `editable`.
- `POST /api/app/session/{session_id}/batch/close` всегда переводит app session в `awaiting_context_confirmation`, чтобы пользователь проходил этап проверки контекста перед генерацией.
- `GET /api/app/session/{session_id}` может вернуть `403 Session ownership mismatch`, если `session_id` принадлежит другому app user или устаревшему login target.
- Response: generation payload + legacy fields (`primary_message`, `why`, `fallback_simple_version`, `next_step`, `alternatives`)
- Frontend PWA также резервирует интеграцию под `POST /api/app/push/subscribe` для Web Push subscriptions.
- Endpoint push subscription пока является backend follow-up dependency: UI prompt и client-side registration уже заложены в `frontend-app`, но доставка уведомлений не считается завершенной без server persistence и sender job.

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

## Cross-domain handoff
- Browser surfaces (`frontend-site`, `frontend-landing`, `frontend-pay`) отправляют browser-facing API calls только в `API_PUBLIC_BASE_URL`.
- Acquisition attribution между `landing -> pay -> api` сохраняется через `clickid`, `landing_id`, `entry_host`, `entry_path`, `tracking_params`.
- `frontend-landing` и `frontend-pay` сохраняют tracking query params в browser storage и прокидывают их в navigation/API payloads.
- Payment state changes и Stripe/webhook side effects остаются backend-owned.

## CORS and attribution
- `BACKEND_CORS_ALLOW_ORIGINS` хранит comma-separated allowlist browser origins для `site`, `landing` и `pay`.
- `orders` и `quiz_sessions` сохраняют attribution поля:
  - `brand`
  - `landing_id`
  - `entry_host`
  - `entry_path`

## Telegram Bot modes
- Admin commands:
  - `/grant_access` -> FSM `email -> YYYY-MM-DD`, доступно только `BOT_ADMIN_IDS`
  - `/revoke_access` -> FSM `email`, доступно только `BOT_ADMIN_IDS`
- Дата в `/grant_access` трактуется как конец дня `Europe/Moscow`.
- Local: `BOT_MODE=polling`
- Prod: `BOT_MODE=webhook`, webhook URL `https://<domain>/tg/webhook/<secret>`

## Telegram bot payment link config
- `BOT_PAY_URL`: явная ссылка на страницу оплаты в боте.
- Если `BOT_PAY_URL` пустой, bot использует fallback `${PAY_PUBLIC_BASE_URL}/ru/pay/manage`.
- Bot дописывает `tg_chat_id` в pay URL перед показом inline-кнопки.
- `BOT_LANDING_URL` не является обязательным env в v1: bot flow ведет пользователя сразу в pay/manage surface.
- При неактивном доступе (`is_paid=false`, в т.ч. `pending`, `token_issued`, `expired`, `revoked`) middleware и `/start` отвечают сообщением с кнопкой `Оплатить доступ`.
