# 11. Troubleshooting

## `/api/payment/checkout-session` returns `502 Stripe error`
- Проверьте `STRIPE_SECRET_KEY`.
- Проверьте корректность payload (`mode`, `plan`, `email`, `clickid`).

## `/api/stripe/webhook` returns `400 Invalid webhook`
- Проверьте `stripe-signature`.
- Проверьте `STRIPE_WEBHOOK_SECRET`.

## `/api/payment/session-status` returns `404`
- Проверьте `session_id` из success URL.

## `POST /api/events/mobi-slon` returns `422`
- Проверьте `X-Request-ID` в ответе и найдите запись в `flirto_guru.http_request_logs`.
- Для payload и validation details смотрите `flirto_guru.mobi_slon_request_logs.raw_body` и `validation_errors`.
- Длинный `page_path` теперь допускается; если `422` остался, проблема в других обязательных полях (`status`, `clickid`, JSON body).

## Mobi-Slon postback is not delivered
- Найдите запись в `flirto_guru.mobi_slon_request_logs` по `clickid` или `request_id`.
- Проверьте `forwarded`, `upstream_status_code`, `upstream_response_body`, `error_class`, `error_message`.
- Для frontend relay сопоставьте ту же попытку с `flirto_guru.http_request_logs` по `request_id`.

## `/api/bot/*` returns `401 Unauthorized`
- Проверьте header `X-Internal-Token`.
- Проверьте совпадение `BOT_INTERNAL_TOKEN` в bot и backend окружении.

## Telegram bot does not receive updates in prod
- Проверьте `BOT_MODE=webhook`.
- Проверьте `APP_PUBLIC_BASE_URL` и `BOT_WEBHOOK_PATH_SECRET`.
- Проверьте Apache route:
  - `https://<domain>/tg/webhook/<secret>` -> `http://bot:8081/webhook/<secret>`

## Telegram bot does not receive updates locally
- Проверьте `BOT_MODE=polling`.
- Проверьте `TELEGRAM_BOT_TOKEN`.
- Проверьте health endpoint бота: `curl http://localhost:8081/health` (если порт опубликован).

## Restore OTP issues
- `429` -> превышен rate limit (`RESTORE_RATE_LIMIT_PER_HOUR`).
- `400 OTP expired` -> перезапросить `/api/auth/restore/request`.
- `400 Invalid OTP` -> проверить OTP из non-prod логов.
- `502 Failed to send OTP email` -> проверьте SMTP vars и Gmail app password (`SMTP_PASSWORD`).

## Access email is not delivered
- Проверьте `EMAIL_DELIVERY_MODE=smtp`.
- Проверьте `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USE_TLS=true`.
- Для Gmail требуется app password, обычный account password не подойдет.

## Legacy endpoint
- `GET /api/payment/redirect` now returns `410 Gone` by design.
