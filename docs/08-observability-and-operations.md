# 08. Observability and Operations

## Key log events
- `email_delivery_skipped`
- `otp_delivery_skipped`
- `telegram_send_failed`
- `stripe_event_ignored`
- `mobi_slon_relay_request`
- `mobi_slon_postback_attempt`
- `mobi_slon_postback_failed`
- `db_request_log_write_failed`
- `bot_access_check`
- `bot_activation_attempt`
- `bot_restore_request`
- `bot_restore_confirm`

## Database request logs
- `seranking.http_request_logs` хранит HTTP request/response логи для `/health`, `/api/payment/*`, `/api/events/mobi-slon`, `/api/tracking/*`.
- `seranking.mobi_slon_request_logs` хранит входящие payload'ы Mobi-Slon relay, validation `422`, upstream response от `mobi-slon.com` и server-side `pay_success` postback.
- Все записанные ответы содержат `request_id`, который также возвращается клиенту в header `X-Request-ID`.
- Для разборов `422` по Mobi-Slon сначала смотреть `mobi_slon_request_logs.validation_errors` и `raw_body`, затем связывать запрос с `http_request_logs` по `request_id`.

## Monitoring checklist
1. Проверять долю webhook ошибок (4xx/5xx).
2. Проверять рост `duplicate=true` (replay rate).
3. Проверять restore rate limit и OTP fail rate.
4. Проверять `fulfillment_status=partial`.
5. Проверять ошибки `401` на `/api/bot/*` (token mismatch).
6. Проверять рост `http_request_logs.status_code=422` по `/api/events/mobi-slon`.
7. Проверять `mobi_slon_request_logs.forwarded=false` и `error_class IS NOT NULL`.

## Ops actions
- Если webhook не доходит: проверить `STRIPE_WEBHOOK_SECRET` и forwarding URL.
- Если Telegram не отправляет: проверить `TELEGRAM_BOT_TOKEN` и `TELEGRAM_BOT_USERNAME`.
- Если bot не активирует доступ: проверить `BOT_INTERNAL_TOKEN` и `BOT_BACKEND_BASE_URL`.
- Если prod webhook Telegram не ходит: проверить Apache proxy для `/tg/webhook/<secret>`.
- Если Mobi-Slon relay падает: искать `request_id` в response header, затем смотреть `seranking.mobi_slon_request_logs` и `seranking.http_request_logs`.
