# 08. Observability and Operations

## Key log events
- `email_delivery_skipped`
- `otp_delivery_skipped`
- `telegram_send_failed`
- `stripe_event_ignored`
- `mobi_slon_relay_request`
- `mobi_slon_postback_attempt`
- `mobi_slon_postback_failed`
- `bot_access_check`
- `bot_activation_attempt`
- `bot_restore_request`
- `bot_restore_confirm`

## Monitoring checklist
1. Проверять долю webhook ошибок (4xx/5xx).
2. Проверять рост `duplicate=true` (replay rate).
3. Проверять restore rate limit и OTP fail rate.
4. Проверять `fulfillment_status=partial`.
5. Проверять ошибки `401` на `/api/bot/*` (token mismatch).

## Ops actions
- Если webhook не доходит: проверить `STRIPE_WEBHOOK_SECRET` и forwarding URL.
- Если Telegram не отправляет: проверить `TELEGRAM_BOT_TOKEN` и `TELEGRAM_BOT_USERNAME`.
- Если bot не активирует доступ: проверить `BOT_INTERNAL_TOKEN` и `BOT_BACKEND_BASE_URL`.
- Если prod webhook Telegram не ходит: проверить Apache proxy для `/tg/webhook/<secret>`.
